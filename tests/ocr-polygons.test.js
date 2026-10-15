'use strict';const test=require('node:test'),assert=require('node:assert/strict'),{overlap}=require('../ocr-polygons');
test('parallel slanted text rows remain distinct even when their axis-aligned boxes overlap',()=>{const box=(x,y)=>[{x,y},{x:x+100,y:y+50},{x:x+96,y:y+58},{x:x-4,y:y+8}];assert.equal(overlap(box(0,0),box(0,20)),0);assert.ok(overlap(box(0,0),box(1,1))>.8);});
