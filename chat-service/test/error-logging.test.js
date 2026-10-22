const { test }=require('node:test');
const assert=require('node:assert/strict');
const { sendHttpError }=require('../src/interfaces/clientError');
test('unexpected controller failures retain HTTP semantics without logging exception payloads',() => {
  const original=console.error, logs=[]; let status,body;
  console.error=(...args) => logs.push(args);
  try {
    sendHttpError({status(value) {status=value;return this;},json(value) {body=value;}},new Error('AUDIT_SENTINEL_SECRET'));
    assert.equal(status,500); assert.deepEqual(body,{error:'INTERNAL_ERROR'});
    assert.equal(JSON.stringify(logs).includes('AUDIT_SENTINEL_SECRET'),false); assert.equal(logs.length,1);
  } finally { console.error=original; }
});
