import test from 'node:test'
import assert from 'node:assert/strict'
import {kansasLeases} from '../app/lib/state-production.mjs'
test('Kansas leases stay distinct and duplicate products never double count',()=>{
 const row={lease_kid:'1',lease_name:'Same name',month:'2026-09-01',product:'oil',volume:12,unit:'bbl',imported_at:'2026-11-08'}
 const leases=kansasLeases([row,{...row,lease_kid:'2',volume:20},{...row,product:'gas',unit:'Mcf',volume:0}],3)
 assert.equal(leases.length,2);assert.equal(leases[0].months[0].oil,12);assert.equal(leases[0].months[0].gas,0);assert.equal(leases[1].months[0].gas,null)
 const duplicates=kansasLeases([row,row],2)[0].months[0];assert.equal(duplicates.oil,null);assert.equal(duplicates.unresolved,true)
 assert.equal(kansasLeases([row],2).length,0)
})
