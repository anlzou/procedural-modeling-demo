const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ControlPanel-D4D72QtF.js","assets/index-C7PxtXtX.js","assets/index-CsVk4bN1.css","assets/ControlPanel-CVXK6Jtt.css"])))=>i.map(i=>d[i]);
import{Bt as e,Ct as t,Et as n,G as r,Ht as i,J as a,K as o,Lt as s,Mt as c,Pt as l,Q as u,Rt as d,V as f,Vt as p,X as m,dt as h,it as ee,jt as te,lt as g,nt as _,rt as v,st as ne,tt as y,wt as re,xt as b,yt as x,zt as ie}from"./three-B7NUA4d8.js";import{A as ae,E as S,N as oe,O as C,S as se,b as ce,g as le,h as w,j as T,m as ue,n as de,p as E,s as fe,t as pe,u as D,x as O,y as me}from"./index-C7PxtXtX.js";import{t as he}from"./InfoPanel-PWo04KDj.js";import{t as ge}from"./useSceneReady-BKc7G88E.js";var _e=`varying vec2 vUv;\r
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
`,ye={class:`page`},be={class:`controls-row`},xe=[`onClick`],k=de({__name:`SDFRaymarching`,emits:[`ready`,`progress`,`error`],setup(de,{emit:k}){let Se=le(()=>pe(()=>import(`./ControlPanel-D4D72QtF.js`),__vite__mapDeps([0,1,2,3]))),{emitProgress:A,markReady:Ce,markError:we}=ge(k),j=C(null),M,N,P,F,I,L,R,z,B,V,H=[],U,W=0,G=0,K=C(0),q=C(0),Te=C(8),J=C(!0),Y=C(1),X=C(!0),Z=C([null,null,null,null,null]),Q=C([!1,!1,!1,!1,!1]),$=[{key:`spring`,label:`螺旋弹簧`,color:2282478},{key:`dna`,label:`DNA 双螺旋`,color:10980346},{key:`superformula`,label:`超公式曲面`,color:16096779},{key:`sierpinski`,label:`谢尔宾斯基四面体`,color:15680580},{key:`stellation`,label:`星芒多面体`,color:3462041}];function Ee(e){J.value=e}function De(e){Y.value=e}function Oe(){X.value=!X.value,H.forEach(e=>{e.mesh.visible=X.value})}function ke(e){Q.value[e]=!Q.value[e];let t=Le(e);t&&(t.visible=Q.value[e])}ce(()=>{try{A(.28,`初始化 WebGL…`),Ae(),A(.72,`编译着色器…`),ze()}catch(e){console.error(e),we(`场景初始化失败，请刷新重试`)}}),me(()=>{U&&cancelAnimationFrame(U),F?.dispose(),P?.dispose(),H.forEach(e=>{M.remove(e.mesh),e.mesh.geometry?.dispose(),e.mesh.material?.dispose()}),Z.value.forEach(e=>{e&&(M.remove(e),e instanceof g?e.children.forEach(e=>{e.geometry?.dispose(),e.material?.dispose()}):(e.geometry?.dispose(),e.material?.dispose()))})});function Ae(){let e=j.value,t=e.clientWidth,i=e.clientHeight;M=new te,N=new re(50,t/i,.1,100),N.position.set(0,2,6),P=new r({antialias:!0}),P.setSize(t,i),P.setPixelRatio(Math.min(window.devicePixelRatio,2)),P.toneMapping=4,P.toneMappingExposure=1.2,e.appendChild(P.domElement),F=new f(N,P.domElement),F.enableDamping=!0,F.autoRotate=!0,F.autoRotateSpeed=.8,F.minDistance=2,F.maxDistance=20,F.target.set(0,0,0);let a=new l(50,32,32);I=new c({vertexShader:_e,fragmentShader:ve,uniforms:{uTime:{value:0},uResolution:{value:new p(t,i)}},side:1}),L=new x(a,I),M.add(L),R=new o(4210784,.6),M.add(R),z=new v(16777215,2),z.position.set(5,10,7),M.add(z),B=new v(4491519,1),B.position.set(-5,3,-5),M.add(B),V=new n(16737860,1.5,10),V.position.set(0,3,0),M.add(V),je(),window.addEventListener(`resize`,Re)}function je(){[[ie,[.6,.25,100,16],8141549,[-1.8,.2,0],[.8,.5,.3]],[h,[.5,0],16096779,[1.8,-.5,0],[.4,.7,.1]],[t,[.45],440020,[0,.8,-1.5],[.6,.3,.5]],[d,[.5,.2,30,50],15485081,[0,-.6,1.8],[.5,.2,.7]],[ee,[.4],2278750,[-1.2,-.8,1.2],[.3,.9,.2]],[a,[.7,.7,.7],15680580,[1.4,.6,-1.2],[.7,.4,.6]],[y,[.4,.8,8],9133302,[-.8,-.3,-1.8],[.5,.6,.4]],[_,[.35,.35,.7,16],1357990,[.9,-.2,1.6],[.2,.8,.3]]].forEach(([e,t,n,r,a],o)=>{let s=new b({color:n,emissive:n,emissiveIntensity:.3,roughness:.2,metalness:.7,clearcoat:.4}),c=new x(new e(...t),s);c.position.set(r[0],r[1],r[2]),M.add(c),H.push({mesh:c,rotSpeed:a,initPos:new i(r[0],r[1],r[2]),phase:o*1.2})})}function Me(){let t=[];for(let e=0;e<=100;e++){let n=e/100*10*Math.PI*2;t.push(new i(Math.cos(n)*.7,(e/100-.5)*3,Math.sin(n)*.7))}return new e(new u(t),120,.07,8,!1)}function Ne(){let t=new g,n=new b({color:10980346,roughness:.3,metalness:.6}),r=new b({color:2282478,roughness:.4,metalness:.3}),a=[];for(let r=0;r<2;r++){let o=[],s=r*Math.PI;for(let e=0;e<=120;e++){let t=e/120*4*Math.PI*2;o.push(new i(Math.cos(t+s)*.6,(e/120-.5)*4,Math.sin(t+s)*.6))}let c=new x(new e(new u(o),100,.06,6,!1),n);t.add(c),a.push(o)}for(let e=0;e<=20;e++){let n=e/20,a=n*4*Math.PI*2,o=(n-.5)*4,s=new i(Math.cos(a)*.6,o,Math.sin(a)*.6),c=new i(Math.cos(a+Math.PI)*.6,o,Math.sin(a+Math.PI)*.6),l=s.clone().add(c).multiplyScalar(.5),u=c.clone().sub(s),d=new x(new _(.02,.02,u.length(),4),r);d.position.copy(l),d.quaternion.setFromUnitVectors(new i(0,1,0),u.clone().normalize()),t.add(d)}return t}function Pe(){let e=[],t=[];function n(e,t,n,r,i,a,o){return(Math.abs(Math.cos(r*e/4)/t)**+a+Math.abs(Math.sin(r*e/4)/n)**+o)**(-1/i)}for(let t=0;t<=60;t++){let r=t/60*Math.PI;for(let t=0;t<=60;t++){let i=t/60*Math.PI*2,a=n(r,1,1,6,1.5,1,1)*n(i,1,1,6,1.5,1,1),o=a*Math.sin(r)*Math.cos(i),s=a*Math.sin(r)*Math.sin(i),c=a*Math.cos(r);e.push(o*.8,s*.8,c*.8)}}for(let e=0;e<60;e++)for(let n=0;n<60;n++){let r=e*61+n,i=r+60+1;t.push(r,i,r+1,i,i+1,r+1)}let r=new m;return r.setAttribute(`position`,new ne(e,3)),r.setIndex(t),r.computeVertexNormals(),r}function Fe(){let e=new g;function t(e,n,r,i,a,o){if(a===0){let t=new x(new s(.5),new b({color:15680580,roughness:.3,metalness:.4,emissive:15680580,emissiveIntensity:.1})),a=e.clone().add(n).add(r).add(i).multiplyScalar(.25);t.position.copy(a),o.add(t);return}let c=(e,t)=>e.clone().add(t).multiplyScalar(.5),l=c(e,n),u=c(e,r),d=c(e,i),f=c(n,r),p=c(n,i),m=c(r,i);t(e,l,u,d,a-1,o),t(n,l,f,p,a-1,o),t(r,u,f,m,a-1,o),t(i,d,p,m,a-1,o)}let n=1.5;return t(new i(0,n,0),new i(-1.5,-1.5/2,n/2),new i(n,-1.5/2,n/2),new i(0,-1.5/2,-1.5),3,e),e}function Ie(){let e=new g,t=new h(.8,0).getAttribute(`position`),n=[];for(let e=0;e<t.count;e+=3){let r=new i(t.getX(e),t.getY(e),t.getZ(e)),a=new i(t.getX(e+1),t.getY(e+1),t.getZ(e+1)),o=new i(t.getX(e+2),t.getY(e+2),t.getZ(e+2));n.push(r.clone().add(a).add(o).divideScalar(3))}let r=new b({color:3462041,roughness:.2,metalness:.7,emissive:3462041,emissiveIntensity:.15});e.add(new x(new h(.7,0),r));let a=new b({color:2282478,roughness:.15,metalness:.8,emissive:2282478,emissiveIntensity:.1});for(let t of n){let n=t.clone().normalize(),r=new x(new y(.12,.45,6),a);r.position.copy(n.clone().multiplyScalar(.85)),r.quaternion.setFromUnitVectors(new i(0,1,0),n),e.add(r)}return e}function Le(e){if(Z.value[e])return Z.value[e];let t=[{fn:Me,pos:[-2.2,.5,0],rotSpeed:[.6,.3,.1]},{fn:Ne,pos:[0,.5,-2.2],rotSpeed:[.2,.8,0]},{fn:Pe,pos:[2.2,0,0],rotSpeed:[.4,.5,.2]},{fn:Fe,pos:[0,-.3,2.2],rotSpeed:[.3,.6,.1]},{fn:Ie,pos:[0,1.5,0],rotSpeed:[.5,.4,.3]}][e];if(!t)return null;let{fn:n,pos:r,rotSpeed:a}=t,o=n(),s;return o instanceof g?(s=o,s.position.set(r[0],r[1],r[2]),s.children.forEach(t=>{t.userData.rotSpeed=a,t.userData.initPos=new i(r[0],r[1],r[2]),t.userData.phase=e*1.5})):(s=new x(o,new b({color:$[e].color,roughness:.25,metalness:.6,emissive:$[e].color,emissiveIntensity:.1,side:2})),s.position.set(r[0],r[1],r[2])),s.visible=Q.value[e],s.userData.rotSpeed=a,s.userData.initPos=new i(r[0],r[1],r[2]),s.userData.phase=e*1.5,M.add(s),Z.value[e]=s,s}function Re(){let e=j.value;if(!e||!P)return;let t=e.clientWidth,n=e.clientHeight;N.aspect=t/n,N.updateProjectionMatrix(),P.setSize(t,n),I&&I.uniforms.uResolution.value.set(t,n)}function ze(e){U=requestAnimationFrame(ze);let t=e*.001;if(W++,e-G>=1e3&&(K.value=W,W=0,G=e,window.performance?.memory&&(q.value=window.performance.memory.usedJSHeapSize)),J.value){let e=Y.value;I&&(I.uniforms.uTime.value=t*e),H.forEach((n,r)=>{n.mesh.rotation.x+=n.rotSpeed[0]*.012*e,n.mesh.rotation.y+=n.rotSpeed[1]*.012*e,n.mesh.rotation.z+=n.rotSpeed[2]*.012*e,n.mesh.position.y=n.initPos.y+Math.sin(t*.6*e+n.phase)*.3,n.mesh.position.x=n.initPos.x+Math.sin(t*.4*e+n.phase*.7)*.15,n.mesh.material.emissiveIntensity=.3+.2*Math.sin(t*.8*e+n.phase)}),Z.value.forEach((n,r)=>{if(!n||!n.visible)return;let a=n.userData.rotSpeed||[.3,.4,.2];if(n instanceof g)n.rotation.x+=a[0]*.008*e,n.rotation.y+=a[1]*.008*e,n.rotation.z+=a[2]*.008*e;else{n.rotation.x+=a[0]*.008*e,n.rotation.y+=a[1]*.008*e,n.rotation.z+=a[2]*.008*e;let o=n.userData.initPos||new i(0,0,0),s=n.userData.phase||r;n.position.y=o.y+Math.sin(t*.5*e+s)*.2}})}F.update(),J.value?F.autoRotate=!0:F.autoRotate=!1,P.render(M,N),Ce()}return(e,t)=>(O(),E(`div`,ye,[w(he,null,{header:S(()=>[...t[0]||=[D(`h2`,null,`🔮 路径 1：SDF + Raymarching`,-1),D(`p`,null,[D(`strong`,null,`核心原理：`),ue(`不生成网格，直接在 Fragment Shader 中用数学函数定义空间中的形状，通过光线步进（Raymarching）渲染。`)],-1)]]),default:S(()=>[t[1]||=D(`div`,{class:`features`},[D(`span`,null,`✓ SDF 基本体：球体、立方体、圆环、圆柱`),D(`span`,null,`✓ 布尔运算：并集、交集、差集、平滑并集`),D(`span`,null,`✓ 扭曲变形、表面位移`),D(`span`,null,`✓ Mandelbulb 分形`),D(`span`,null,`✓ 5 种复杂 Three.js 模型：螺旋弹簧、DNA 双螺旋等`)],-1),t[2]||=D(`div`,{class:`section-title`,style:{"margin-top":`0.6rem`,"font-size":`0.7rem`,color:`rgba(255,255,255,0.4)`,"text-transform":`uppercase`,"letter-spacing":`0.5px`,"border-top":`1px solid rgba(255,255,255,0.06)`,"padding-top":`0.6rem`}},`模型显隐`,-1),D(`div`,be,[D(`button`,{class:T([`btn`,{active:X.value}]),onClick:Oe},`🟣 基本体组合`,2),(O(),E(fe,null,se($,(e,t)=>D(`button`,{key:e.key,class:T([`btn`,{active:Q.value[t]}]),onClick:e=>ke(t)},oe(e.label),11,xe)),64))]),t[3]||=D(`p`,{class:`hint`},`🖱 拖拽旋转 · 滚轮缩放`,-1)]),_:1}),w(ae(Se),{fps:K.value,memory:q.value,objectCount:Te.value,lightSources:e.lightSources,onTogglePlay:Ee,onUpdateSpeed:De,onUpdateLight:e.onUpdateLight},null,8,[`fps`,`memory`,`objectCount`,`lightSources`,`onUpdateLight`]),D(`div`,{ref_key:`canvasRef`,ref:j,class:`canvas-container`},null,512)]))}},[[`__scopeId`,`data-v-aaea5378`]]);export{k as default};