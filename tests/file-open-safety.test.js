'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {openFileLimit,createFileOpenGuard}=require('../file-open-safety');
const files=count=>Array.from({length:count},(_,i)=>path.resolve(`test-${i}.png`));
function fixture(response=0){
  const settings={maxOpenFiles:20,language:'sl'},dialogs=[],owner={isDestroyed:()=>false};
  const authorize=createFileOpenGuard({getSettings:()=>settings,showMessageBox:async(_owner,options)=>{dialogs.push(options);return {response};}});
  return {settings,dialogs,owner,authorize};
}
test('limits reject invalid saved values and default to 20',()=>{
  for(const value of [undefined,null,0,-1,NaN,Infinity,2.5,'20'])assert.equal(openFileLimit(value),20);
  assert.equal(openFileLimit(1),1);assert.equal(openFileLimit(37),37);
});
test('single file opens directly; duplicates do not cause a bulk prompt',async()=>{
  const f=fixture(),one=files(1);assert.deepEqual(await f.authorize(f.owner,[...one,...one]),one);assert.equal(f.dialogs.length,0);
});
test('bulk prompt uses exact count and defaults to Cancel',async()=>{
  const f=fixture(1);assert.deepEqual(await f.authorize(f.owner,files(2)),[]);
  assert.match(f.dialogs[0].message,/2 datotek/);assert.equal(f.dialogs[0].defaultId,1);assert.equal(f.dialogs[0].cancelId,1);
});
test('exactly 20 can be approved, but 21 cannot be overridden',async()=>{
  const f=fixture();assert.equal((await f.authorize(f.owner,files(20))).length,20);
  assert.deepEqual(await f.authorize(f.owner,files(21)),[]);assert.equal(f.dialogs[1].type,'warning');assert.equal(f.dialogs[1].buttons.length,1);
});
test('configured maximum is respected including one-file-only mode',async()=>{
  const f=fixture();f.settings.maxOpenFiles=1;assert.deepEqual(await f.authorize(f.owner,files(2)),[]);
  assert.equal((await f.authorize(f.owner,files(1))).length,1);
});
test('changing the limit while a confirmation is open cannot override it',async()=>{
  const settings={maxOpenFiles:20,language:'en'},dialogs=[];
  const authorize=createFileOpenGuard({getSettings:()=>settings,showMessageBox:async(_owner,options)=>{dialogs.push(options);settings.maxOpenFiles=1;return {response:0};}});
  assert.deepEqual(await authorize({isDestroyed:()=>false},files(2)),[]);assert.equal(dialogs.length,2);assert.match(dialogs[1].detail,/maximum is 1/);
});
test('requests in multiple windows share one dialog queue',async()=>{
  let release,shown=0;
  const authorize=createFileOpenGuard({getSettings:()=>({maxOpenFiles:20}),showMessageBox:()=>{shown++;return new Promise(resolve=>{release=resolve;});}}),owner={isDestroyed:()=>false};
  const first=authorize(owner,files(2)),second=authorize(owner,files(3));await new Promise(setImmediate);assert.equal(shown,1);
  release({response:1});await first;await new Promise(setImmediate);assert.equal(shown,2);release({response:1});await second;
});
