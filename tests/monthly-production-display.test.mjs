import test from 'node:test'
import assert from 'node:assert/strict'
import {reportedNumber,displayTotal,chartPoints} from '../app/lib/monthly-production.mjs'
test('missing volumes stay unknown, reported zero remains zero, totals disclose missing values',()=>{
 for(const value of [null,undefined,'', ' ',false,'NaN',Infinity,-1])assert.equal(reportedNumber(value),null)
 assert.equal(reportedNumber('0'),0)
 assert.deepEqual(displayTotal([{oil:0},{oil:null},{oil:12.5}],'oil'),{value:12.5,partial:true})
 assert.deepEqual(displayTotal([{gas:null}],'gas'),{value:null,partial:true})
})
test('calendar gaps keep their position and never become zero production',()=>{
 const points=chartPoints([{month:'2026-01',oil:0},{month:'2026-03',oil:10}])
 assert.deepEqual(points.map(p=>[p.month,p.oil]),[['2026-01',0],['2026-02',null],['2026-03',10]])
 const long=chartPoints([{month:'2020-01',oil:1},{month:'2026-03',oil:10}]);assert.equal(long.length,24);assert.equal(long[0].month,'2024-04')
})
