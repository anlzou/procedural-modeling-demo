const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ControlPanel-dku2uWpW.js","assets/index-By_Yzoj1.js","assets/index-BBieG9Uj.css","assets/ControlPanel-aoP_Vrze.css"])))=>i.map(i=>d[i]);
import{At as e,Ct as t,Dt as n,Et as r,G as i,J as a,Mt as o,Ot as s,P as c,R as l,U as u,V as d,X as f,Y as p,Z as m,_t as ee,et as te,ft as h,gt as ne,it as g,jt as re,kt as _,mt as v,nt as y,vt as ie,wt as ae,z as oe}from"./three-BWld2i2n.js";import{C as b,D as x,E as S,T as C,_ as se,b as ce,f as w,h as le,k as ue,l as T,m as E,n as de,o as fe,p as pe,t as me,v as he,y as D}from"./index-By_Yzoj1.js";import{t as ge}from"./InfoPanel-DKRNg1l7.js";var _e=`varying vec2 vUv;\r
void main() {\r
    vUv = uv;\r
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}\r
`,ve=`precision highp float;\r
uniform float uTime;\r
uniform vec2 uResolution;\r
varying vec2 vUv;\r
\r
// ---- SDF Primitives ----\r
float sdSphere(vec3 p, float r) { return length(p) - r; }\r
float sdBox(vec3 p, vec3 b) {\r
    vec3 d = abs(p) - b;\r
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));\r
}\r
float sdTorus(vec3 p, vec2 t) {\r
    vec2 q = vec2(length(p.xz) - t.x, p.y);\r
    return length(q) - t.y;\r
}\r
float sdCylinder(vec3 p, vec3 c) { return length(p.xz - c.xy) - c.z; }\r
\r
// ---- Boolean Operations ----\r
float opUnion(float a, float b) { return min(a, b); }\r
float opIntersection(float a, float b) { return max(a, b); }\r
float opSubtraction(float a, float b) { return max(-a, b); }\r
float opSmoothUnion(float a, float b, float k) {\r
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);\r
    return mix(b, a, h) - k * h * (1.0 - h);\r
}\r
\r
// ---- Domain Operations ----\r
float opTwist(vec3 p, float k) {\r
    float c = cos(k * p.y), s = sin(k * p.y);\r
    vec3 q = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);\r
    return sdBox(q, vec3(0.5));\r
}\r
float opDisplace(vec3 p, float d) {\r
    return d + sin(3.0 * p.x) * sin(3.0 * p.y) * sin(3.0 * p.z) * 0.1;\r
}\r
\r
// ---- Mandelbulb Fractal ----\r
float mandelbulb(vec3 p) {\r
    vec3 z = p; float dr = 1.0, r = 0.0;\r
    for (int i = 0; i < 6; i++) {\r
        r = length(z); if (r > 2.0) break;\r
        float theta = acos(z.z / r) * 8.0, phi = atan(z.y, z.x) * 8.0, zr = pow(r, 8.0);\r
        dr = pow(r, 7.0) * 8.0 * dr + 1.0;\r
        z = zr * vec3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta)) + p;\r
    }\r
    return 0.5 * log(r) * r / dr;\r
}\r
\r
// ---- Scene (single scene) ----\r
float scene(vec3 p) {\r
    float t = uTime * 0.3;\r
    vec3 spherePos = vec3(sin(t) * 1.5, sin(t * 0.7) * 0.5, 0.0);\r
    float sphere = sdSphere(p - spherePos, 0.8);\r
    float box = opTwist(p - vec3(-1.5, 0.0, 0.0), 1.5);\r
    float torus = sdTorus(p - vec3(1.5, 0.0, 0.0), vec2(0.7, 0.25));\r
    float cyl = opDisplace(p - vec3(0.0, -1.5, 0.0), sdCylinder(p - vec3(0.0, -1.5, 0.0), vec3(0.0, 0.0, 0.5)));\r
    float fractal = mandelbulb(p * 0.8 + vec3(0.0, 1.5, 0.0));\r
    float combined = opUnion(opUnion(opUnion(sphere, box), torus), cyl);\r
    if (length(p - vec3(0.0, 2.5, 0.0)) < 2.0) combined = opUnion(combined, fractal);\r
    return opUnion(combined, p.y + 2.0);\r
}\r
\r
// ---- Normal Calculation ----\r
vec3 calcNormal(vec3 p) {\r
    float eps = 0.001;\r
    return normalize(vec3(\r
        scene(p + vec3(eps, 0, 0)) - scene(p - vec3(eps, 0, 0)),\r
        scene(p + vec3(0, eps, 0)) - scene(p - vec3(0, eps, 0)),\r
        scene(p + vec3(0, 0, eps)) - scene(p - vec3(0, 0, eps))\r
    ));\r
}\r
\r
// ---- Raymarching ----\r
float raymarch(vec3 ro, vec3 rd) {\r
    float t = 0.0;\r
    for (int i = 0; i < 100; i++) {\r
        float d = scene(ro + t * rd);\r
        if (d < 0.001 || t > 50.0) break;\r
        t += d;\r
    }\r
    return t;\r
}\r
\r
// ---- Main ----\r
void main() {\r
    vec2 uv = (vUv - 0.5) * 2.0;\r
    uv.x *= uResolution.x / uResolution.y;\r
\r
    float camAngle = uTime * 0.15;\r
    vec3 ro = vec3(sin(camAngle) * 5.0, 1.0, cos(camAngle) * 5.0);\r
    vec3 rd = normalize(vec3(uv, -1.5));\r
\r
    vec3 forward = normalize(vec3(-ro.x, 0.0, -ro.z));\r
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));\r
    vec3 up = cross(right, forward);\r
    rd = normalize(rd.x * right + rd.y * up + rd.z * forward);\r
\r
    float rayT = raymarch(ro, rd);\r
    vec3 color;\r
\r
    if (rayT < 50.0) {\r
        vec3 p = ro + rayT * rd;\r
        vec3 normal = calcNormal(p);\r
\r
        // Lighting\r
        vec3 lightDir = normalize(vec3(1.0, 1.0, -1.0));\r
        float diff = max(dot(normal, lightDir), 0.0);\r
        float ambient = 0.2;\r
        vec3 lightColor = vec3(1.0, 0.95, 0.9);\r
\r
        vec3 viewDir = normalize(ro - p);\r
        vec3 reflectDir = reflect(-lightDir, normal);\r
        float spec = pow(max(dot(reflectDir, viewDir), 0.0), 32.0);\r
\r
        // Color based on position\r
        vec3 objectColor = vec3(\r
            0.3 + 0.5 * abs(normal.x),\r
            0.4 + 0.5 * abs(normal.y),\r
            0.6 + 0.5 * abs(normal.z)\r
        );\r
\r
        color = objectColor * (ambient + diff * lightColor) + vec3(1.0) * spec * 0.5;\r
\r
        float fog = 1.0 - exp(-0.03 * rayT);\r
        color = mix(color, vec3(0.05, 0.05, 0.1), fog);\r
    } else {\r
        color = vec3(0.05, 0.05, 0.1);\r
    }\r
\r
    gl_FragColor = vec4(color, 1.0);\r
}\r
`,ye={class:`page`},be={class:`controls-row`},xe=[`onClick`],O=de({__name:`SDFRaymarching`,setup(de){let O=le(()=>me(()=>import(`./ControlPanel-dku2uWpW.js`),__vite__mapDeps([0,1,2,3]))),k=C(null),A,j,M,N,P,F,I,L,R,z,B=[],V,H=0,U=0,W=C(0),G=C(0),Se=C(8),K=C(!0),q=C(1),J=C(!0),Y=C([]),X=C([!1,!1,!1,!1,!1]),Z=[{key:`spring`,label:`螺旋弹簧`,color:2282478},{key:`dna`,label:`DNA 双螺旋`,color:10980346},{key:`superformula`,label:`超公式曲面`,color:16096779},{key:`sierpinski`,label:`谢尔宾斯基四面体`,color:15680580},{key:`stellation`,label:`星芒多面体`,color:3462041}];function Ce(e){K.value=e}function we(e){q.value=e}function Te(){J.value=!J.value,B.forEach(e=>{e.mesh.visible=J.value})}function Ee(e){X.value[e]=!X.value[e],Y.value[e]&&(Y.value[e].visible=X.value[e])}he(()=>{De(),$()}),se(()=>{V&&cancelAnimationFrame(V),N?.dispose(),M?.dispose(),B.forEach(e=>{A.remove(e.mesh),e.mesh.geometry?.dispose(),e.mesh.material?.dispose()}),Y.value.forEach(e=>{A.remove(e),e instanceof y?e.children.forEach(e=>{e.geometry?.dispose(),e.material?.dispose()}):(e.geometry?.dispose(),e.material?.dispose())})});function De(){let e=k.value,n=e.clientWidth,i=e.clientHeight;A=new t,j=new ee(50,n/i,.1,100),j.position.set(0,2,6),M=new l({antialias:!0}),M.setSize(n,i),M.setPixelRatio(Math.min(window.devicePixelRatio,2)),M.toneMapping=4,M.toneMappingExposure=1.2,e.appendChild(M.domElement),N=new c(j,M.domElement),N.enableDamping=!0,N.autoRotate=!0,N.autoRotateSpeed=.8,N.minDistance=2,N.maxDistance=20,N.target.set(0,0,0);let a=new r(50,32,32);P=new ae({vertexShader:_e,fragmentShader:ve,uniforms:{uTime:{value:0},uResolution:{value:new re(n,i)}},side:1}),F=new h(a,P),A.add(F),I=new oe(4210784,.6),A.add(I),L=new f(16777215,2),L.position.set(5,10,7),A.add(L),R=new f(4491519,1),R.position.set(-5,3,-5),A.add(R),z=new ie(16737860,1.5,10),z.position.set(0,3,0),A.add(z),Oe(),Ne(),window.addEventListener(`resize`,Pe)}function Oe(){[[_,[.6,.25,100,16],8141549,[-1.8,.2,0],[.8,.5,.3]],[g,[.5,0],16096779,[1.8,-.5,0],[.4,.7,.1]],[ne,[.45],440020,[0,.8,-1.5],[.6,.3,.5]],[s,[.5,.2,30,50],15485081,[0,-.6,1.8],[.5,.2,.7]],[m,[.4],2278750,[-1.2,-.8,1.2],[.3,.9,.2]],[d,[.7,.7,.7],15680580,[1.4,.6,-1.2],[.7,.4,.6]],[a,[.4,.8,8],9133302,[-.8,-.3,-1.8],[.5,.6,.4]],[p,[.35,.35,.7,16],1357990,[.9,-.2,1.6],[.2,.8,.3]]].forEach(([e,t,n,r,i],a)=>{let s=new v({color:n,emissive:n,emissiveIntensity:.3,roughness:.2,metalness:.7,clearcoat:.4}),c=new h(new e(...t),s);c.position.set(r[0],r[1],r[2]),A.add(c),B.push({mesh:c,rotSpeed:i,initPos:new o(r[0],r[1],r[2]),phase:a*1.2})})}function Q(){let t=[];for(let e=0;e<=100;e++){let n=e/100*10*Math.PI*2;t.push(new o(Math.cos(n)*.7,(e/100-.5)*3,Math.sin(n)*.7))}return new e(new i(t),120,.07,8,!1)}function ke(){let t=new y,n=new v({color:10980346,roughness:.3,metalness:.6}),r=new v({color:2282478,roughness:.4,metalness:.3}),a=[];for(let r=0;r<2;r++){let s=[],c=r*Math.PI;for(let e=0;e<=120;e++){let t=e/120*4*Math.PI*2;s.push(new o(Math.cos(t+c)*.6,(e/120-.5)*4,Math.sin(t+c)*.6))}let l=new h(new e(new i(s),100,.06,6,!1),n);t.add(l),a.push(s)}for(let e=0;e<=20;e++){let n=e/20,i=n*4*Math.PI*2,a=(n-.5)*4,s=new o(Math.cos(i)*.6,a,Math.sin(i)*.6),c=new o(Math.cos(i+Math.PI)*.6,a,Math.sin(i+Math.PI)*.6),l=s.clone().add(c).multiplyScalar(.5),u=c.clone().sub(s),d=new h(new p(.02,.02,u.length(),4),r);d.position.copy(l),d.quaternion.setFromUnitVectors(new o(0,1,0),u.clone().normalize()),t.add(d)}return t}function Ae(){let e=[],t=[];function n(e,t,n,r,i,a,o){return(Math.abs(Math.cos(r*e/4)/t)**+a+Math.abs(Math.sin(r*e/4)/n)**+o)**(-1/i)}for(let t=0;t<=60;t++){let r=t/60*Math.PI;for(let t=0;t<=60;t++){let i=t/60*Math.PI*2,a=n(r,1,1,6,1.5,1,1)*n(i,1,1,6,1.5,1,1),o=a*Math.sin(r)*Math.cos(i),s=a*Math.sin(r)*Math.sin(i),c=a*Math.cos(r);e.push(o*.8,s*.8,c*.8)}}for(let e=0;e<60;e++)for(let n=0;n<60;n++){let r=e*61+n,i=r+60+1;t.push(r,i,r+1,i,i+1,r+1)}let r=new u;return r.setAttribute(`position`,new te(e,3)),r.setIndex(t),r.computeVertexNormals(),r}function je(){let e=new y;function t(e,r,i,a,o,s){if(o===0){let t=new h(new n(.5),new v({color:15680580,roughness:.3,metalness:.4,emissive:15680580,emissiveIntensity:.1})),o=e.clone().add(r).add(i).add(a).multiplyScalar(.25);t.position.copy(o),s.add(t);return}let c=(e,t)=>e.clone().add(t).multiplyScalar(.5),l=c(e,r),u=c(e,i),d=c(e,a),f=c(r,i),p=c(r,a),m=c(i,a);t(e,l,u,d,o-1,s),t(r,l,f,p,o-1,s),t(i,u,f,m,o-1,s),t(a,d,p,m,o-1,s)}let r=1.5;return t(new o(0,r,0),new o(-1.5,-1.5/2,r/2),new o(r,-1.5/2,r/2),new o(0,-1.5/2,-1.5),3,e),e}function Me(){let e=new y,t=new g(.8,0).getAttribute(`position`),n=[];for(let e=0;e<t.count;e+=3){let r=new o(t.getX(e),t.getY(e),t.getZ(e)),i=new o(t.getX(e+1),t.getY(e+1),t.getZ(e+1)),a=new o(t.getX(e+2),t.getY(e+2),t.getZ(e+2));n.push(r.clone().add(i).add(a).divideScalar(3))}let r=new v({color:3462041,roughness:.2,metalness:.7,emissive:3462041,emissiveIntensity:.15});e.add(new h(new g(.7,0),r));let i=new v({color:2282478,roughness:.15,metalness:.8,emissive:2282478,emissiveIntensity:.1});for(let t of n){let n=t.clone().normalize(),r=new h(new a(.12,.45,6),i);r.position.copy(n.clone().multiplyScalar(.85)),r.quaternion.setFromUnitVectors(new o(0,1,0),n),e.add(r)}return e}function Ne(){[{fn:Q,pos:[-2.2,.5,0],rotSpeed:[.6,.3,.1]},{fn:ke,pos:[0,.5,-2.2],rotSpeed:[.2,.8,0]},{fn:Ae,pos:[2.2,0,0],rotSpeed:[.4,.5,.2]},{fn:je,pos:[0,-.3,2.2],rotSpeed:[.3,.6,.1]},{fn:Me,pos:[0,1.5,0],rotSpeed:[.5,.4,.3]}].forEach(({fn:e,pos:t,rotSpeed:n},r)=>{let i=e();if(i instanceof y)i.position.set(t[0],t[1],t[2]),i.visible=X.value[r],A.add(i),Y.value.push(i),i.userData.rotSpeed=n,i.children.forEach(e=>{e.userData.rotSpeed=n,e.userData.initPos=new o(t[0],t[1],t[2]),e.userData.phase=r*1.5});else{let e=new h(i,new v({color:Z[r].color,roughness:.25,metalness:.6,emissive:Z[r].color,emissiveIntensity:.1,side:2}));e.position.set(t[0],t[1],t[2]),e.visible=X.value[r],A.add(e),Y.value.push(e),e.userData.rotSpeed=n,e.userData.initPos=new o(t[0],t[1],t[2]),e.userData.phase=r*1.5}})}function Pe(){let e=k.value;if(!e||!M)return;let t=e.clientWidth,n=e.clientHeight;j.aspect=t/n,j.updateProjectionMatrix(),M.setSize(t,n),P&&P.uniforms.uResolution.value.set(t,n)}function $(e){V=requestAnimationFrame($);let t=e*.001;if(H++,e-U>=1e3&&(W.value=H,H=0,U=e,window.performance?.memory&&(G.value=window.performance.memory.usedJSHeapSize)),K.value){let e=q.value;P&&(P.uniforms.uTime.value=t*e),B.forEach((n,r)=>{n.mesh.rotation.x+=n.rotSpeed[0]*.012*e,n.mesh.rotation.y+=n.rotSpeed[1]*.012*e,n.mesh.rotation.z+=n.rotSpeed[2]*.012*e,n.mesh.position.y=n.initPos.y+Math.sin(t*.6*e+n.phase)*.3,n.mesh.position.x=n.initPos.x+Math.sin(t*.4*e+n.phase*.7)*.15,n.mesh.material.emissiveIntensity=.3+.2*Math.sin(t*.8*e+n.phase)}),Y.value.forEach((n,r)=>{let i=n.userData.rotSpeed||[.3,.4,.2];if(n instanceof y)n.rotation.x+=i[0]*.008*e,n.rotation.y+=i[1]*.008*e,n.rotation.z+=i[2]*.008*e;else{n.rotation.x+=i[0]*.008*e,n.rotation.y+=i[1]*.008*e,n.rotation.z+=i[2]*.008*e;let a=n.userData.initPos||new o(0,0,0),s=n.userData.phase||r;n.position.y=a.y+Math.sin(t*.5*e+s)*.2}})}N.update(),K.value?N.autoRotate=!0:N.autoRotate=!1,M.render(A,j)}return(e,t)=>(D(),w(`div`,ye,[E(ge,null,{header:b(()=>[...t[0]||=[T(`h2`,null,`🔮 路径 1：SDF + Raymarching`,-1),T(`p`,null,[T(`strong`,null,`核心原理：`),pe(`不生成网格，直接在 Fragment Shader 中用数学函数定义空间中的形状，通过光线步进（Raymarching）渲染。`)],-1)]]),default:b(()=>[t[1]||=T(`div`,{class:`features`},[T(`span`,null,`✓ SDF 基本体：球体、立方体、圆环、圆柱`),T(`span`,null,`✓ 布尔运算：并集、交集、差集、平滑并集`),T(`span`,null,`✓ 扭曲变形、表面位移`),T(`span`,null,`✓ Mandelbulb 分形`),T(`span`,null,`✓ 5 种复杂 Three.js 模型：螺旋弹簧、DNA 双螺旋等`)],-1),t[2]||=T(`div`,{class:`section-title`,style:{"margin-top":`0.6rem`,"font-size":`0.7rem`,color:`rgba(255,255,255,0.4)`,"text-transform":`uppercase`,"letter-spacing":`0.5px`,"border-top":`1px solid rgba(255,255,255,0.06)`,"padding-top":`0.6rem`}},`模型显隐`,-1),T(`div`,be,[T(`button`,{class:x([`btn`,{active:J.value}]),onClick:Te},`🟣 基本体组合`,2),(D(),w(fe,null,ce(Z,(e,t)=>T(`button`,{key:e.key,class:x([`btn`,{active:X.value[t]}]),onClick:e=>Ee(t)},ue(e.label),11,xe)),64))]),t[3]||=T(`p`,{class:`hint`},`🖱 拖拽旋转 · 滚轮缩放`,-1)]),_:1}),E(S(O),{fps:W.value,memory:G.value,objectCount:Se.value,lightSources:e.lightSources,onTogglePlay:Ce,onUpdateSpeed:we,onUpdateLight:e.onUpdateLight},null,8,[`fps`,`memory`,`objectCount`,`lightSources`,`onUpdateLight`]),T(`div`,{ref_key:`canvasRef`,ref:k,class:`canvas-container`},null,512)]))}},[[`__scopeId`,`data-v-d6663b8e`]]);export{O as default};