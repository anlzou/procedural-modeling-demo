const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ControlPanel-D5id5IlL.js","assets/index-BHnYc7re.js","assets/index-CWFZOKAo.css","assets/ControlPanel-CVXK6Jtt.css"])))=>i.map(i=>d[i]);
import{At as e,B as t,Bt as n,Ct as r,G as i,It as a,Lt as o,Nt as s,Rt as c,St as l,Tt as u,Vt as d,W as f,Y as p,Z as m,bt as h,ct as g,et as _,jt as ee,nt as v,ot as te,q as ne,rt as re,tt as y,ut as b,vt as x,zt as S}from"./three-BkefTctm.js";import{A as ie,D as ae,E as C,O as w,b as T,f as E,h as oe,l as D,m as O,n as se,o as ce,p as le,t as ue,v as de,w as k,x as fe,y as pe}from"./index-BHnYc7re.js";import{t as me}from"./InfoPanel-BMm6D8L6.js";var he=`varying vec2 vUv;\r
void main() {\r
    vUv = uv;\r
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}\r
`,ge=`precision highp float;\r
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
`,_e={class:`page`},ve={class:`controls-row`},ye=[`onClick`],A=se({__name:`SDFRaymarching`,setup(se){let A=oe(()=>ue(()=>import(`./ControlPanel-D5id5IlL.js`),__vite__mapDeps([0,1,2,3]))),j=C(null),M,N,P,F,I,L,R,z,B,V,H=[],U,W=0,G=0,K=C(0),q=C(0),be=C(8),J=C(!0),Y=C(1),X=C(!0),Z=C([]),Q=C([!1,!1,!1,!1,!1]),$=[{key:`spring`,label:`螺旋弹簧`,color:2282478},{key:`dna`,label:`DNA 双螺旋`,color:10980346},{key:`superformula`,label:`超公式曲面`,color:16096779},{key:`sierpinski`,label:`谢尔宾斯基四面体`,color:15680580},{key:`stellation`,label:`星芒多面体`,color:3462041}];function xe(e){J.value=e}function Se(e){Y.value=e}function Ce(){X.value=!X.value,H.forEach(e=>{e.mesh.visible=X.value})}function we(e){Q.value[e]=!Q.value[e],Z.value[e]&&(Z.value[e].visible=Q.value[e])}pe(()=>{Te(),Pe()}),de(()=>{U&&cancelAnimationFrame(U),F?.dispose(),P?.dispose(),H.forEach(e=>{M.remove(e.mesh),e.mesh.geometry?.dispose(),e.mesh.material?.dispose()}),Z.value.forEach(e=>{M.remove(e),e instanceof g?e.children.forEach(e=>{e.geometry?.dispose(),e.material?.dispose()}):(e.geometry?.dispose(),e.material?.dispose())})});function Te(){let a=j.value,o=a.clientWidth,c=a.clientHeight;M=new e,N=new r(50,o/c,.1,100),N.position.set(0,2,6),P=new f({antialias:!0}),P.setSize(o,c),P.setPixelRatio(Math.min(window.devicePixelRatio,2)),P.toneMapping=4,P.toneMappingExposure=1.2,a.appendChild(P.domElement),F=new t(N,P.domElement),F.enableDamping=!0,F.autoRotate=!0,F.autoRotateSpeed=.8,F.minDistance=2,F.maxDistance=20,F.target.set(0,0,0);let l=new s(50,32,32);I=new ee({vertexShader:he,fragmentShader:ge,uniforms:{uTime:{value:0},uResolution:{value:new n(o,c)}},side:1}),L=new x(l,I),M.add(L),R=new i(4210784,.6),M.add(R),z=new v(16777215,2),z.position.set(5,10,7),M.add(z),B=new v(4491519,1),B.position.set(-5,3,-5),M.add(B),V=new u(16737860,1.5,10),V.position.set(0,3,0),M.add(V),Ee(),Me(),window.addEventListener(`resize`,Ne)}function Ee(){[[c,[.6,.25,100,16],8141549,[-1.8,.2,0],[.8,.5,.3]],[b,[.5,0],16096779,[1.8,-.5,0],[.4,.7,.1]],[l,[.45],440020,[0,.8,-1.5],[.6,.3,.5]],[o,[.5,.2,30,50],15485081,[0,-.6,1.8],[.5,.2,.7]],[re,[.4],2278750,[-1.2,-.8,1.2],[.3,.9,.2]],[ne,[.7,.7,.7],15680580,[1.4,.6,-1.2],[.7,.4,.6]],[_,[.4,.8,8],9133302,[-.8,-.3,-1.8],[.5,.6,.4]],[y,[.35,.35,.7,16],1357990,[.9,-.2,1.6],[.2,.8,.3]]].forEach(([e,t,n,r,i],a)=>{let o=new h({color:n,emissive:n,emissiveIntensity:.3,roughness:.2,metalness:.7,clearcoat:.4}),s=new x(new e(...t),o);s.position.set(r[0],r[1],r[2]),M.add(s),H.push({mesh:s,rotSpeed:i,initPos:new d(r[0],r[1],r[2]),phase:a*1.2})})}function De(){let e=[];for(let t=0;t<=100;t++){let n=t/100*10*Math.PI*2;e.push(new d(Math.cos(n)*.7,(t/100-.5)*3,Math.sin(n)*.7))}return new S(new m(e),120,.07,8,!1)}function Oe(){let e=new g,t=new h({color:10980346,roughness:.3,metalness:.6}),n=new h({color:2282478,roughness:.4,metalness:.3}),r=[];for(let n=0;n<2;n++){let i=[],a=n*Math.PI;for(let e=0;e<=120;e++){let t=e/120*4*Math.PI*2;i.push(new d(Math.cos(t+a)*.6,(e/120-.5)*4,Math.sin(t+a)*.6))}let o=new x(new S(new m(i),100,.06,6,!1),t);e.add(o),r.push(i)}for(let t=0;t<=20;t++){let r=t/20,i=r*4*Math.PI*2,a=(r-.5)*4,o=new d(Math.cos(i)*.6,a,Math.sin(i)*.6),s=new d(Math.cos(i+Math.PI)*.6,a,Math.sin(i+Math.PI)*.6),c=o.clone().add(s).multiplyScalar(.5),l=s.clone().sub(o),u=new x(new y(.02,.02,l.length(),4),n);u.position.copy(c),u.quaternion.setFromUnitVectors(new d(0,1,0),l.clone().normalize()),e.add(u)}return e}function ke(){let e=[],t=[];function n(e,t,n,r,i,a,o){return(Math.abs(Math.cos(r*e/4)/t)**+a+Math.abs(Math.sin(r*e/4)/n)**+o)**(-1/i)}for(let t=0;t<=60;t++){let r=t/60*Math.PI;for(let t=0;t<=60;t++){let i=t/60*Math.PI*2,a=n(r,1,1,6,1.5,1,1)*n(i,1,1,6,1.5,1,1),o=a*Math.sin(r)*Math.cos(i),s=a*Math.sin(r)*Math.sin(i),c=a*Math.cos(r);e.push(o*.8,s*.8,c*.8)}}for(let e=0;e<60;e++)for(let n=0;n<60;n++){let r=e*61+n,i=r+60+1;t.push(r,i,r+1,i,i+1,r+1)}let r=new p;return r.setAttribute(`position`,new te(e,3)),r.setIndex(t),r.computeVertexNormals(),r}function Ae(){let e=new g;function t(e,n,r,i,o,s){if(o===0){let t=new x(new a(.5),new h({color:15680580,roughness:.3,metalness:.4,emissive:15680580,emissiveIntensity:.1})),o=e.clone().add(n).add(r).add(i).multiplyScalar(.25);t.position.copy(o),s.add(t);return}let c=(e,t)=>e.clone().add(t).multiplyScalar(.5),l=c(e,n),u=c(e,r),d=c(e,i),f=c(n,r),p=c(n,i),m=c(r,i);t(e,l,u,d,o-1,s),t(n,l,f,p,o-1,s),t(r,u,f,m,o-1,s),t(i,d,p,m,o-1,s)}let n=1.5;return t(new d(0,n,0),new d(-1.5,-1.5/2,n/2),new d(n,-1.5/2,n/2),new d(0,-1.5/2,-1.5),3,e),e}function je(){let e=new g,t=new b(.8,0).getAttribute(`position`),n=[];for(let e=0;e<t.count;e+=3){let r=new d(t.getX(e),t.getY(e),t.getZ(e)),i=new d(t.getX(e+1),t.getY(e+1),t.getZ(e+1)),a=new d(t.getX(e+2),t.getY(e+2),t.getZ(e+2));n.push(r.clone().add(i).add(a).divideScalar(3))}let r=new h({color:3462041,roughness:.2,metalness:.7,emissive:3462041,emissiveIntensity:.15});e.add(new x(new b(.7,0),r));let i=new h({color:2282478,roughness:.15,metalness:.8,emissive:2282478,emissiveIntensity:.1});for(let t of n){let n=t.clone().normalize(),r=new x(new _(.12,.45,6),i);r.position.copy(n.clone().multiplyScalar(.85)),r.quaternion.setFromUnitVectors(new d(0,1,0),n),e.add(r)}return e}function Me(){[{fn:De,pos:[-2.2,.5,0],rotSpeed:[.6,.3,.1]},{fn:Oe,pos:[0,.5,-2.2],rotSpeed:[.2,.8,0]},{fn:ke,pos:[2.2,0,0],rotSpeed:[.4,.5,.2]},{fn:Ae,pos:[0,-.3,2.2],rotSpeed:[.3,.6,.1]},{fn:je,pos:[0,1.5,0],rotSpeed:[.5,.4,.3]}].forEach(({fn:e,pos:t,rotSpeed:n},r)=>{let i=e();if(i instanceof g)i.position.set(t[0],t[1],t[2]),i.visible=Q.value[r],M.add(i),Z.value.push(i),i.userData.rotSpeed=n,i.children.forEach(e=>{e.userData.rotSpeed=n,e.userData.initPos=new d(t[0],t[1],t[2]),e.userData.phase=r*1.5});else{let e=new x(i,new h({color:$[r].color,roughness:.25,metalness:.6,emissive:$[r].color,emissiveIntensity:.1,side:2}));e.position.set(t[0],t[1],t[2]),e.visible=Q.value[r],M.add(e),Z.value.push(e),e.userData.rotSpeed=n,e.userData.initPos=new d(t[0],t[1],t[2]),e.userData.phase=r*1.5}})}function Ne(){let e=j.value;if(!e||!P)return;let t=e.clientWidth,n=e.clientHeight;N.aspect=t/n,N.updateProjectionMatrix(),P.setSize(t,n),I&&I.uniforms.uResolution.value.set(t,n)}function Pe(e){U=requestAnimationFrame(Pe);let t=e*.001;if(W++,e-G>=1e3&&(K.value=W,W=0,G=e,window.performance?.memory&&(q.value=window.performance.memory.usedJSHeapSize)),J.value){let e=Y.value;I&&(I.uniforms.uTime.value=t*e),H.forEach((n,r)=>{n.mesh.rotation.x+=n.rotSpeed[0]*.012*e,n.mesh.rotation.y+=n.rotSpeed[1]*.012*e,n.mesh.rotation.z+=n.rotSpeed[2]*.012*e,n.mesh.position.y=n.initPos.y+Math.sin(t*.6*e+n.phase)*.3,n.mesh.position.x=n.initPos.x+Math.sin(t*.4*e+n.phase*.7)*.15,n.mesh.material.emissiveIntensity=.3+.2*Math.sin(t*.8*e+n.phase)}),Z.value.forEach((n,r)=>{let i=n.userData.rotSpeed||[.3,.4,.2];if(n instanceof g)n.rotation.x+=i[0]*.008*e,n.rotation.y+=i[1]*.008*e,n.rotation.z+=i[2]*.008*e;else{n.rotation.x+=i[0]*.008*e,n.rotation.y+=i[1]*.008*e,n.rotation.z+=i[2]*.008*e;let a=n.userData.initPos||new d(0,0,0),o=n.userData.phase||r;n.position.y=a.y+Math.sin(t*.5*e+o)*.2}})}F.update(),J.value?F.autoRotate=!0:F.autoRotate=!1,P.render(M,N)}return(e,t)=>(T(),E(`div`,_e,[O(me,null,{header:k(()=>[...t[0]||=[D(`h2`,null,`🔮 路径 1：SDF + Raymarching`,-1),D(`p`,null,[D(`strong`,null,`核心原理：`),le(`不生成网格，直接在 Fragment Shader 中用数学函数定义空间中的形状，通过光线步进（Raymarching）渲染。`)],-1)]]),default:k(()=>[t[1]||=D(`div`,{class:`features`},[D(`span`,null,`✓ SDF 基本体：球体、立方体、圆环、圆柱`),D(`span`,null,`✓ 布尔运算：并集、交集、差集、平滑并集`),D(`span`,null,`✓ 扭曲变形、表面位移`),D(`span`,null,`✓ Mandelbulb 分形`),D(`span`,null,`✓ 5 种复杂 Three.js 模型：螺旋弹簧、DNA 双螺旋等`)],-1),t[2]||=D(`div`,{class:`section-title`,style:{"margin-top":`0.6rem`,"font-size":`0.7rem`,color:`rgba(255,255,255,0.4)`,"text-transform":`uppercase`,"letter-spacing":`0.5px`,"border-top":`1px solid rgba(255,255,255,0.06)`,"padding-top":`0.6rem`}},`模型显隐`,-1),D(`div`,ve,[D(`button`,{class:w([`btn`,{active:X.value}]),onClick:Ce},`🟣 基本体组合`,2),(T(),E(ce,null,fe($,(e,t)=>D(`button`,{key:e.key,class:w([`btn`,{active:Q.value[t]}]),onClick:e=>we(t)},ie(e.label),11,ye)),64))]),t[3]||=D(`p`,{class:`hint`},`🖱 拖拽旋转 · 滚轮缩放`,-1)]),_:1}),O(ae(A),{fps:K.value,memory:q.value,objectCount:be.value,lightSources:e.lightSources,onTogglePlay:xe,onUpdateSpeed:Se,onUpdateLight:e.onUpdateLight},null,8,[`fps`,`memory`,`objectCount`,`lightSources`,`onUpdateLight`]),D(`div`,{ref_key:`canvasRef`,ref:j,class:`canvas-container`},null,512)]))}},[[`__scopeId`,`data-v-d6663b8e`]]);export{A as default};