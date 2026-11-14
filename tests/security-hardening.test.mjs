import test from 'node:test';
import assert from 'node:assert/strict';
import headers from '../security-headers.cjs';
import {safeAdminDestination} from '../lib/admin-navigation.mjs';
test('administrator redirect rejects external, script and path escape targets',()=>{
 for(const input of ['javascript:alert(1)','https://evil.invalid/','//evil.invalid','/\\evil.invalid','/app/admin/../../evil','/app/admin/%2e%2e/evil','/app/administer','/app/admin\n','',null]) assert.equal(safeAdminDestination(input),'/app/admin/documents',String(input));
 assert.equal(safeAdminDestination('/app/admin/exports?view=recent#runs'),'/app/admin/exports?view=recent#runs');
 assert.equal(safeAdminDestination('/app/admin'),'/app/admin');
});
test('baseline browser policy preserves scripts and map/CAPTCHA requests',()=>{
 const h=Object.fromEntries(headers.map(({key,value})=>[key,value]));
 assert.equal(h['X-Content-Type-Options'],'nosniff');
 assert.match(h['Content-Security-Policy'],/frame-ancestors 'none'/);
 assert.doesNotMatch(h['Content-Security-Policy'],/default-src|script-src|connect-src/);
 assert.doesNotMatch(h['Strict-Transport-Security'],/includeSubDomains|preload/);
});
