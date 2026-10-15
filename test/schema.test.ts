import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';

// Validates the worked examples and the test-vector documents against the
// normative JSON Schemas, so that the schemas, the examples, the vectors and
// the reference validator cannot drift apart. Ajv is a development dependency
// only; the library itself has no runtime dependencies.

type DocType = 'record' | 'attestation';
type Doc = Record<string, unknown>;
interface Schema { $schema: string; $id: string; properties: { spec: { const: string } } }

const read = <T>(rel: string): T => JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')) as T;

const ajv = new Ajv2020Module.default({ allErrors: true, strict: true });
addFormatsModule.default(ajv);

const provenanceSchema = read<Schema>('schema/action-provenance-1.0.schema.json');
const approvalSchema = read<Schema>('schema/action-approval-1.0.schema.json');
const validators = { record: ajv.compile(provenanceSchema), attestation: ajv.compile(approvalSchema) };
const typeOf = (doc: Doc): DocType => (doc.spec === 'action-approval/1.0' ? 'attestation' : 'record');
const check = (type: DocType, doc: unknown) => {
  const v = validators[type];
  const ok = v(doc);
  return { ok, errors: ok ? [] : (v.errors ?? []).map((e) => `${e.instancePath} ${e.message ?? ''}`) };
};

describe('schemas', () => {
  it('are JSON Schema 2020-12 documents with the published identifiers', () => {
    expect(provenanceSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(provenanceSchema.$id).toBe('https://renly.ai/spec/action-provenance/1.0/schema.json');
    expect(provenanceSchema.properties.spec.const).toBe('action-provenance/1.0');
    expect(approvalSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(approvalSchema.$id).toBe('https://renly.ai/spec/action-approval/1.0/schema.json');
    expect(approvalSchema.properties.spec.const).toBe('action-approval/1.0');
  });
});

describe('examples validate against the schemas', () => {
  const files = readdirSync(new URL('../examples/', import.meta.url)).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    it(file, () => {
      const doc = read<Doc>(`examples/${file}`);
      expect(check(typeOf(doc), doc)).toEqual({ ok: true, errors: [] });
    });
  }
});

describe('test-vector documents validate against the schemas', () => {
  const docs: [string, DocType, Doc][] = [];
  for (const v of read<{ vectors: { name: string; type: DocType; document: Doc }[] }>('test-vectors/content-digest.json').vectors) {
    docs.push([`content-digest ${v.name}`, v.type, v.document]);
  }
  for (const v of read<{ vectors: { name: string; type: DocType; document: Doc; sealed: Doc }[] }>('test-vectors/seal-and-verify.json').vectors) {
    docs.push([`seal ${v.name} (unsealed)`, v.type, v.document]);
    docs.push([`seal ${v.name} (sealed)`, v.type, v.sealed]);
  }
  for (const v of read<{ vectors: { seq: number; sealed: Doc }[] }>('test-vectors/chain.json').vectors) {
    docs.push([`chain seq ${v.seq}`, 'record', v.sealed]);
  }
  for (const [name, grant] of Object.entries(read<{ grants: Record<string, Doc> }>('test-vectors/coverage.json').grants)) {
    docs.push([`coverage grant ${name}`, 'attestation', grant]);
  }
  const levels = read<{ cases: { name: string; type: DocType; document: Doc; expectedLevel: number }[] }>('test-vectors/conformance-levels.json').cases;
  for (const c of levels) if (c.expectedLevel >= 1) docs.push([`level ${c.name}`, c.type, c.document]);

  for (const [name, type, doc] of docs) {
    it(name, () => expect(check(type, doc)).toEqual({ ok: true, errors: [] }));
  }

  it('documents below Level 1 because a required member is missing or malformed also fail the schema', () => {
    for (const name of ['record-without-principal', 'record-bad-digest-syntax', 'attestation-without-argsDigest']) {
      const c = levels.find((x) => x.name === name);
      expect(c?.expectedLevel).toBe(0);
      expect(check(c!.type, c!.document).ok).toBe(false);
    }
  });
});
