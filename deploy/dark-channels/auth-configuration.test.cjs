// Run offline against the actual source with TypeScript from the pinned image.
const fs=require('fs'), vm=require('vm'), assert=require('node:assert/strict');
const ts=require('/app/node_modules/typescript');
const root='/source/'; let vars={};
const element=(type,props)=>({type,props});
const generic=()=>null;
function load(file, extras={}) {
  const code=ts.transpileModule(fs.readFileSync(root+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  const req=id=>{
    if(extras[id])return extras[id];
    if(id==='react/jsx-runtime')return {jsx:element,jsxs:element};
    if(id==='react')return {useState:x=>[x,generic],useMemo:f=>f(),useCallback:f=>f,useEffect:generic};
    if(id.endsWith('variable.context'))return {useVariables:()=>vars};
    if(id==='react-hook-form')return {FormProvider:'FormProvider',useForm:()=>({register:name=>({name}),handleSubmit:generic,formState:{errors:{}}})};
    if(id.endsWith('get.transation.service.client'))return {useT:()=>((key,text)=>text)};
    if(id.endsWith('google.provider'))return {GoogleProvider:'GoogleProvider'};
    if(id==='react-use-cookie')return {__esModule:true,default:()=>['',generic]};
    if(id==='next/dynamic')return {__esModule:true,default:()=>generic};
    return new Proxy({__esModule:true,default:generic},{get:(o,k)=>k in o?o[k]:generic});
  };
  vm.runInNewContext(code,{require:req,module,exports:module.exports,process:{env:vars},console});
  return module.exports;
}
function walk(x,out=[]) {
  if(Array.isArray(x))x.forEach(v=>walk(v,out));
  else if(x && typeof x==='object') {out.push(x);walk(x.props?.children,out);}
  return out;
}
let tests=0;
const layout=fs.readFileSync(root+'apps/frontend/src/app/(app)/layout.tsx','utf8');
const flag=layout.match(/googleLoginEnabled=\{(!!\([\s\S]*?\))\}/)[1];
for(const [id,secret,expected] of [[undefined,undefined,false],['fixture-id',undefined,false],[undefined,'fixture-secret',false],[' ','fixture-secret',false],['fixture-id',' ',false],['fixture-id','fixture-secret',true]]) {
  const env={YOUTUBE_CLIENT_ID:id,YOUTUBE_CLIENT_SECRET:secret};
  assert.equal(vm.runInNewContext(flag,{process:{env}}),expected);tests++;
  vars={...env,isGeneral:true,googleLoginEnabled:expected};
  for(const [file,exported,args] of [['login','Login',undefined],['register','RegisterAfter',{token:'',provider:'LOCAL'}]]) {
    const tree=load('apps/frontend/src/components/auth/'+file+'.tsx')[exported](args);
    const nodes=walk(tree);
    assert.equal(nodes.some(n=>n.type==='GoogleProvider'),expected);
    for(const name of ['email','password'])assert(nodes.some(n=>n.props?.name===name));
    const text=nodes.map(n=>n.props?.children).flat().filter(x=>typeof x==='string');
    assert.equal(text.includes('Continue With'),expected); assert.equal(text.includes('or'),expected); tests++;
  }
  let calls=0;
  class HttpException extends Error {constructor(message,status){super(message);this.status=status;}}
  class OAuth2 {constructor(config){calls++;assert.equal(config.clientId,id);assert.equal(config.clientSecret,secret);}generateAuthUrl(){return 'fixture-url';}}
  const {GoogleProvider}=load('apps/backend/src/services/auth/providers/google.provider.ts',{
    googleapis:{google:{auth:{OAuth2}}},'@nestjs/common':{HttpException},
    '@gitroom/backend/services/auth/providers.interface':{AuthProvider:()=>x=>x,AuthProviderAbstract:class{}},
  });
  if(expected)assert.equal(new GoogleProvider().generateLink(),'fixture-url');
  else assert.throws(()=>new GoogleProvider().generateLink(),e=>e.status===503 && e.message.includes('email and password'));
  assert.equal(calls,expected?1:0); tests++;
}
console.log(JSON.stringify({passed:tests,network:'none',fixtures:'absent,partial,whitespace,present; login/register JSX and actual provider'}));
