import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
function load(path){const exports={};new Function('exports',ts.transpile(readFileSync(path,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(exports);return exports;}
const E=load('src/lib/auth/errors.ts');
test('a longer minimum is reported as-is, not as "at least 6"',()=>{
  const m=E.authErrorMessage({code:'weak_password',message:'Password should be at least 8 characters.',reasons:['length']});
  assert.match(m,/at least 8 characters/);
});
test('character rules list what is missing',()=>{
  const m=E.authErrorMessage({code:'weak_password',name:'AuthWeakPasswordError',message:"Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};':\"|<>?,./`~.",reasons:['characters']});
  assert.match(m,/a lowercase letter, a capital letter, a number and a symbol/);
  assert.doesNotMatch(m,/at least 6/);
});
test('leaked passwords, same password, reauthentication and lost sessions get clear messages',()=>{
  assert.match(E.authErrorMessage({code:'weak_password',message:'Password is known to be weak and easy to guess, please choose a different one.',reasons:['pwned']}),/data leak/);
  assert.match(E.authErrorMessage({code:'same_password',message:'New password should be different from the old password.'}),/already your password/);
  assert.match(E.authErrorMessage({code:'reauthentication_needed',message:'Password update requires reauthentication'}),/confirmation code/);
  assert.match(E.authErrorMessage({name:'AuthSessionMissingError',message:'Auth session missing!'}),/sign-in has expired/);
  assert.match(E.authErrorMessage({message:'{"bad":"json"}'}),/couldn't reach the server/);
});
