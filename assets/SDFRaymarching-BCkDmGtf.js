const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ControlPanel-DIUdj3zg.js","assets/index-BbqKCUUZ.js","assets/index-CWFZOKAo.css","assets/ControlPanel-CVXK6Jtt.css"])))=>i.map(i=>d[i]);
import{Bt as e,Ct as t,Et as n,G as r,Ht as i,J as a,K as o,Lt as s,Mt as c,Pt as l,Q as u,Rt as d,V as f,Vt as p,X as m,dt as h,it as ee,jt as te,lt as g,nt as _,rt as v,st as ne,tt as y,wt as re,xt as b,yt as x,zt as ie}from"./three-CsnE6BFP.js";import{A as ae,D as oe,E as S,O as C,b as w,f as T,h as se,l as E,m as D,n as ce,o as le,p as ue,t as de,v as fe,w as O,x as pe,y as me}from"./index-BbqKCUUZ.js";import{t as he}from"./InfoPanel-BnPT1AiH.js";var ge=`varying vec2 vUv;\r
void main() {\r
    vUv = uv;\r
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}\r
`,_e=`precision highp float;\r
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
`,ve={class:`page`},ye={class:`controls-row`},be=[`onClick`],k=ce({__name:`SDFRaymarching`,setup(ce){let k=se(()=>de(()=>import(`./ControlPanel-DIUdj3zg.js`),__vite__mapDeps([0,1,2,3]))),A=S(null),j,M,N,P,F,I,L,R,z,B,V=[],H,U=0,W=0,G=S(0),K=S(0),xe=S(8),q=S(!0),J=S(1),Y=S(!0),X=S([]),Z=S([!1,!1,!1,!1,!1]),Q=[{key:`spring`,label:`螺旋弹簧`,color:2282478},{key:`dna`,label:`DNA 双螺旋`,color:10980346},{key:`superformula`,label:`超公式曲面`,color:16096779},{key:`sierpinski`,label:`谢尔宾斯基四面体`,color:15680580},{key:`stellation`,label:`星芒多面体`,color:3462041}];function Se(e){q.value=e}function Ce(e){J.value=e}function we(){Y.value=!Y.value,V.forEach(e=>{e.mesh.visible=Y.value})}function Te(e){Z.value[e]=!Z.value[e],X.value[e]&&(X.value[e].visible=Z.value[e])}me(()=>{Ee(),$()}),fe(()=>{H&&cancelAnimationFrame(H),P?.dispose(),N?.dispose(),V.forEach(e=>{j.remove(e.mesh),e.mesh.geometry?.dispose(),e.mesh.material?.dispose()}),X.value.forEach(e=>{j.remove(e),e instanceof g?e.children.forEach(e=>{e.geometry?.dispose(),e.material?.dispose()}):(e.geometry?.dispose(),e.material?.dispose())})});function Ee(){let e=A.value,t=e.clientWidth,i=e.clientHeight;j=new te,M=new re(50,t/i,.1,100),M.position.set(0,2,6),N=new r({antialias:!0}),N.setSize(t,i),N.setPixelRatio(Math.min(window.devicePixelRatio,2)),N.toneMapping=4,N.toneMappingExposure=1.2,e.appendChild(N.domElement),P=new f(M,N.domElement),P.enableDamping=!0,P.autoRotate=!0,P.autoRotateSpeed=.8,P.minDistance=2,P.maxDistance=20,P.target.set(0,0,0);let a=new l(50,32,32);F=new c({vertexShader:ge,fragmentShader:_e,uniforms:{uTime:{value:0},uResolution:{value:new p(t,i)}},side:1}),I=new x(a,F),j.add(I),L=new o(4210784,.6),j.add(L),R=new v(16777215,2),R.position.set(5,10,7),j.add(R),z=new v(4491519,1),z.position.set(-5,3,-5),j.add(z),B=new n(16737860,1.5,10),B.position.set(0,3,0),j.add(B),De(),Ne(),window.addEventListener(`resize`,Pe)}function De(){[[ie,[.6,.25,100,16],8141549,[-1.8,.2,0],[.8,.5,.3]],[h,[.5,0],16096779,[1.8,-.5,0],[.4,.7,.1]],[t,[.45],440020,[0,.8,-1.5],[.6,.3,.5]],[d,[.5,.2,30,50],15485081,[0,-.6,1.8],[.5,.2,.7]],[ee,[.4],2278750,[-1.2,-.8,1.2],[.3,.9,.2]],[a,[.7,.7,.7],15680580,[1.4,.6,-1.2],[.7,.4,.6]],[y,[.4,.8,8],9133302,[-.8,-.3,-1.8],[.5,.6,.4]],[_,[.35,.35,.7,16],1357990,[.9,-.2,1.6],[.2,.8,.3]]].forEach(([e,t,n,r,a],o)=>{let s=new b({color:n,emissive:n,emissiveIntensity:.3,roughness:.2,metalness:.7,clearcoat:.4}),c=new x(new e(...t),s);c.position.set(r[0],r[1],r[2]),j.add(c),V.push({mesh:c,rotSpeed:a,initPos:new i(r[0],r[1],r[2]),phase:o*1.2})})}function Oe(){let t=[];for(let e=0;e<=100;e++){let n=e/100*10*Math.PI*2;t.push(new i(Math.cos(n)*.7,(e/100-.5)*3,Math.sin(n)*.7))}return new e(new u(t),120,.07,8,!1)}function ke(){let t=new g,n=new b({color:10980346,roughness:.3,metalness:.6}),r=new b({color:2282478,roughness:.4,metalness:.3}),a=[];for(let r=0;r<2;r++){let o=[],s=r*Math.PI;for(let e=0;e<=120;e++){let t=e/120*4*Math.PI*2;o.push(new i(Math.cos(t+s)*.6,(e/120-.5)*4,Math.sin(t+s)*.6))}let c=new x(new e(new u(o),100,.06,6,!1),n);t.add(c),a.push(o)}for(let e=0;e<=20;e++){let n=e/20,a=n*4*Math.PI*2,o=(n-.5)*4,s=new i(Math.cos(a)*.6,o,Math.sin(a)*.6),c=new i(Math.cos(a+Math.PI)*.6,o,Math.sin(a+Math.PI)*.6),l=s.clone().add(c).multiplyScalar(.5),u=c.clone().sub(s),d=new x(new _(.02,.02,u.length(),4),r);d.position.copy(l),d.quaternion.setFromUnitVectors(new i(0,1,0),u.clone().normalize()),t.add(d)}return t}function Ae(){let e=[],t=[];function n(e,t,n,r,i,a,o){return(Math.abs(Math.cos(r*e/4)/t)**+a+Math.abs(Math.sin(r*e/4)/n)**+o)**(-1/i)}for(let t=0;t<=60;t++){let r=t/60*Math.PI;for(let t=0;t<=60;t++){let i=t/60*Math.PI*2,a=n(r,1,1,6,1.5,1,1)*n(i,1,1,6,1.5,1,1),o=a*Math.sin(r)*Math.cos(i),s=a*Math.sin(r)*Math.sin(i),c=a*Math.cos(r);e.push(o*.8,s*.8,c*.8)}}for(let e=0;e<60;e++)for(let n=0;n<60;n++){let r=e*61+n,i=r+60+1;t.push(r,i,r+1,i,i+1,r+1)}let r=new m;return r.setAttribute(`position`,new ne(e,3)),r.setIndex(t),r.computeVertexNormals(),r}function je(){let e=new g;function t(e,n,r,i,a,o){if(a===0){let t=new x(new s(.5),new b({color:15680580,roughness:.3,metalness:.4,emissive:15680580,emissiveIntensity:.1})),a=e.clone().add(n).add(r).add(i).multiplyScalar(.25);t.position.copy(a),o.add(t);return}let c=(e,t)=>e.clone().add(t).multiplyScalar(.5),l=c(e,n),u=c(e,r),d=c(e,i),f=c(n,r),p=c(n,i),m=c(r,i);t(e,l,u,d,a-1,o),t(n,l,f,p,a-1,o),t(r,u,f,m,a-1,o),t(i,d,p,m,a-1,o)}let n=1.5;return t(new i(0,n,0),new i(-1.5,-1.5/2,n/2),new i(n,-1.5/2,n/2),new i(0,-1.5/2,-1.5),3,e),e}function Me(){let e=new g,t=new h(.8,0).getAttribute(`position`),n=[];for(let e=0;e<t.count;e+=3){let r=new i(t.getX(e),t.getY(e),t.getZ(e)),a=new i(t.getX(e+1),t.getY(e+1),t.getZ(e+1)),o=new i(t.getX(e+2),t.getY(e+2),t.getZ(e+2));n.push(r.clone().add(a).add(o).divideScalar(3))}let r=new b({color:3462041,roughness:.2,metalness:.7,emissive:3462041,emissiveIntensity:.15});e.add(new x(new h(.7,0),r));let a=new b({color:2282478,roughness:.15,metalness:.8,emissive:2282478,emissiveIntensity:.1});for(let t of n){let n=t.clone().normalize(),r=new x(new y(.12,.45,6),a);r.position.copy(n.clone().multiplyScalar(.85)),r.quaternion.setFromUnitVectors(new i(0,1,0),n),e.add(r)}return e}function Ne(){[{fn:Oe,pos:[-2.2,.5,0],rotSpeed:[.6,.3,.1]},{fn:ke,pos:[0,.5,-2.2],rotSpeed:[.2,.8,0]},{fn:Ae,pos:[2.2,0,0],rotSpeed:[.4,.5,.2]},{fn:je,pos:[0,-.3,2.2],rotSpeed:[.3,.6,.1]},{fn:Me,pos:[0,1.5,0],rotSpeed:[.5,.4,.3]}].forEach(({fn:e,pos:t,rotSpeed:n},r)=>{let a=e();if(a instanceof g)a.position.set(t[0],t[1],t[2]),a.visible=Z.value[r],j.add(a),X.value.push(a),a.userData.rotSpeed=n,a.children.forEach(e=>{e.userData.rotSpeed=n,e.userData.initPos=new i(t[0],t[1],t[2]),e.userData.phase=r*1.5});else{let e=new x(a,new b({color:Q[r].color,roughness:.25,metalness:.6,emissive:Q[r].color,emissiveIntensity:.1,side:2}));e.position.set(t[0],t[1],t[2]),e.visible=Z.value[r],j.add(e),X.value.push(e),e.userData.rotSpeed=n,e.userData.initPos=new i(t[0],t[1],t[2]),e.userData.phase=r*1.5}})}function Pe(){let e=A.value;if(!e||!N)return;let t=e.clientWidth,n=e.clientHeight;M.aspect=t/n,M.updateProjectionMatrix(),N.setSize(t,n),F&&F.uniforms.uResolution.value.set(t,n)}function $(e){H=requestAnimationFrame($);let t=e*.001;if(U++,e-W>=1e3&&(G.value=U,U=0,W=e,window.performance?.memory&&(K.value=window.performance.memory.usedJSHeapSize)),q.value){let e=J.value;F&&(F.uniforms.uTime.value=t*e),V.forEach((n,r)=>{n.mesh.rotation.x+=n.rotSpeed[0]*.012*e,n.mesh.rotation.y+=n.rotSpeed[1]*.012*e,n.mesh.rotation.z+=n.rotSpeed[2]*.012*e,n.mesh.position.y=n.initPos.y+Math.sin(t*.6*e+n.phase)*.3,n.mesh.position.x=n.initPos.x+Math.sin(t*.4*e+n.phase*.7)*.15,n.mesh.material.emissiveIntensity=.3+.2*Math.sin(t*.8*e+n.phase)}),X.value.forEach((n,r)=>{let a=n.userData.rotSpeed||[.3,.4,.2];if(n instanceof g)n.rotation.x+=a[0]*.008*e,n.rotation.y+=a[1]*.008*e,n.rotation.z+=a[2]*.008*e;else{n.rotation.x+=a[0]*.008*e,n.rotation.y+=a[1]*.008*e,n.rotation.z+=a[2]*.008*e;let o=n.userData.initPos||new i(0,0,0),s=n.userData.phase||r;n.position.y=o.y+Math.sin(t*.5*e+s)*.2}})}P.update(),q.value?P.autoRotate=!0:P.autoRotate=!1,N.render(j,M)}return(e,t)=>(w(),T(`div`,ve,[D(he,null,{header:O(()=>[...t[0]||=[E(`h2`,null,`🔮 路径 1：SDF + Raymarching`,-1),E(`p`,null,[E(`strong`,null,`核心原理：`),ue(`不生成网格，直接在 Fragment Shader 中用数学函数定义空间中的形状，通过光线步进（Raymarching）渲染。`)],-1)]]),default:O(()=>[t[1]||=E(`div`,{class:`features`},[E(`span`,null,`✓ SDF 基本体：球体、立方体、圆环、圆柱`),E(`span`,null,`✓ 布尔运算：并集、交集、差集、平滑并集`),E(`span`,null,`✓ 扭曲变形、表面位移`),E(`span`,null,`✓ Mandelbulb 分形`),E(`span`,null,`✓ 5 种复杂 Three.js 模型：螺旋弹簧、DNA 双螺旋等`)],-1),t[2]||=E(`div`,{class:`section-title`,style:{"margin-top":`0.6rem`,"font-size":`0.7rem`,color:`rgba(255,255,255,0.4)`,"text-transform":`uppercase`,"letter-spacing":`0.5px`,"border-top":`1px solid rgba(255,255,255,0.06)`,"padding-top":`0.6rem`}},`模型显隐`,-1),E(`div`,ye,[E(`button`,{class:C([`btn`,{active:Y.value}]),onClick:we},`🟣 基本体组合`,2),(w(),T(le,null,pe(Q,(e,t)=>E(`button`,{key:e.key,class:C([`btn`,{active:Z.value[t]}]),onClick:e=>Te(t)},ae(e.label),11,be)),64))]),t[3]||=E(`p`,{class:`hint`},`🖱 拖拽旋转 · 滚轮缩放`,-1)]),_:1}),D(oe(k),{fps:G.value,memory:K.value,objectCount:xe.value,lightSources:e.lightSources,onTogglePlay:Se,onUpdateSpeed:Ce,onUpdateLight:e.onUpdateLight},null,8,[`fps`,`memory`,`objectCount`,`lightSources`,`onUpdateLight`]),E(`div`,{ref_key:`canvasRef`,ref:A,class:`canvas-container`},null,512)]))}},[[`__scopeId`,`data-v-d6663b8e`]]);export{k as default};