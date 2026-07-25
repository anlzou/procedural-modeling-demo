import{An as e,B as t,Bn as n,Cr as r,P as i,Pr as a,Rr as o,Tr as s,Un as c,_n as l,_t as u,d,ft as f,g as p,gn as m,gt as h,h as g,hr as _,i as ee,jr as v,mr as y,n as te,nr as b,nt as x,o as ne,pr as re,pt as S,r as C,t as w,tt as T,u as ie,ur as E,vt as ae,wn as D,xr as oe,zn as O}from"./CSS3DRenderer-CQg2YHRj.js";import{n as k,t as A}from"./OrbitControls-CVb_478F.js";var j={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},M=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},N=new f(-1,1,1,-1,0,1),P=new class extends d{constructor(){super(),this.setAttribute(`position`,new i([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new i([0,2,0,0,2,0],2))}},F=class{constructor(e){this._mesh=new T(P,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,N)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},I=class extends M{constructor(t,n=`tDiffuse`){super(),this.textureID=n,this.uniforms=null,this.material=null,t instanceof l?(this.uniforms=t.uniforms,this.material=t):t&&(this.uniforms=e.clone(t.uniforms),this.material=new l({name:t.name===void 0?`unspecified`:t.name,defines:Object.assign({},t.defines),uniforms:this.uniforms,vertexShader:t.vertexShader,fragmentShader:t.fragmentShader})),this._fsQuad=new F(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},L=class extends M{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},R=class extends M{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},z=class{constructor(e,n){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),n===void 0){let r=e.getSize(new O);this._width=r.width,this._height=r.height,n=new c(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:t}),n.texture.name=`EffectComposer.rt1`}else this._width=n.width,this._height=n.height;this.renderTarget1=n,this.renderTarget2=n.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new I(j),this.copyPass.material.blending=0,this.timer=new D}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}L!==void 0&&(r instanceof L?n=!0:r instanceof R&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new O);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},B=class extends M{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new p}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},V={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new p(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`},H=class r extends M{constructor(r,i=1,a,o){super(),this.strength=i,this.radius=a,this.threshold=o,this.resolution=r===void 0?new O(256,256):new O(r.x,r.y),this.clearColor=new p(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),u=Math.round(this.resolution.y/2);this.renderTargetBright=new c(s,u,{type:t}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let n=new c(s,u,{type:t});n.texture.name=`UnrealBloomPass.h`+e,n.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(n);let r=new c(s,u,{type:t});r.texture.name=`UnrealBloomPass.v`+e,r.texture.generateMipmaps=!1,this.renderTargetsVertical.push(r),s=Math.round(s/2),u=Math.round(u/2)}let d=V;this.highPassUniforms=e.clone(d.uniforms),this.highPassUniforms.luminosityThreshold.value=o,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new l({uniforms:this.highPassUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader}),this.separableBlurMaterials=[];let f=[6,10,14,18,22];s=Math.round(this.resolution.x/2),u=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(f[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new O(1/s,1/u),s=Math.round(s/2),u=Math.round(u/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=i,this.compositeMaterial.uniforms.bloomRadius.value=.1;let m=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=m,this.bloomTintColors=[new n(1,1,1),new n(1,1,1),new n(1,1,1),new n(1,1,1),new n(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=e.clone(j.uniforms),this.blendMaterial=new l({uniforms:this.copyUniforms,vertexShader:j.vertexShader,fragmentShader:j.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new p,this._oldClearAlpha=1,this._basic=new x,this._fsQuad=new F(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new O(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(e,t,n,i,a){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();let o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),a&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let s=this.renderTargetBright;for(let t=0;t<this.nMips;t++)this._fsQuad.material=this.separableBlurMaterials[t],this.separableBlurMaterials[t].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[t].uniforms.direction.value=r.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[t]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[t].uniforms.colorTexture.value=this.renderTargetsHorizontal[t].texture,this.separableBlurMaterials[t].uniforms.direction.value=r.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[t]),e.clear(),this._fsQuad.render(e),s=this.renderTargetsVertical[t];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(n*n))/n);return new l({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new O(.5,.5)},direction:{value:new O(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {

					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;

					for ( int i = 1; i < KERNEL_RADIUS; i ++ ) {

						float x = float( i );
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * w;

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new l({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};H.BlurDirectionX=new O(1,0),H.BlurDirectionY=new O(0,1);var U={class:`product-page`},W={class:`model-vis-row`},G=b({__name:`ProductShowcase`,emits:[`switchModel`],setup(e,{emit:t}){let i=a(null),c,l,f,b,x,T,D,j,M,N,P,F,I,L=0,R=0,V=a(0),G=a(0),K=a(1),q=a(!0),se=a(1),J=a(!0),Y=a(!0),ce=new g;function le(){J.value=!J.value,P&&(P.visible=J.value),X()}function ue(){Y.value=!Y.value,I&&(I.visible=Y.value),X()}function X(){let e=0;J.value&&e++,Y.value&&e++,K.value=e}function de(e){q.value=e,T&&(T.autoRotate=e)}function Z(e){se.value=e,T&&(T.autoRotateSpeed=e*1.5)}function Q(e){(e.key===` `||e.code===`Space`)&&(e.preventDefault(),q.value=!q.value,T&&(T.autoRotate=q.value))}r(()=>{fe(),$(),window.addEventListener(`keydown`,Q)}),oe(()=>{window.removeEventListener(`keydown`,Q),D&&cancelAnimationFrame(D),D&&cancelAnimationFrame(D),T?.dispose(),f?.dispose(),b?.domElement?.parentNode&&b.domElement.parentNode.removeChild(b.domElement),f?.domElement?.parentNode&&f.domElement.parentNode.removeChild(f.domElement)});function fe(){let e=i.value,t=e.clientWidth,r=e.clientHeight;c=new m,c.background=new p(657930),l=new S(50,t/r,1,5e3),l.position.set(0,0,800),f=new k({antialias:!0,alpha:!0}),f.setSize(t,r),f.setPixelRatio(Math.min(window.devicePixelRatio,2)),f.domElement.style.position=`absolute`,f.domElement.style.top=`0`,f.domElement.style.pointerEvents=`none`,e.appendChild(f.domElement),b=new te,b.setSize(t,r),b.domElement.style.position=`absolute`,b.domElement.style.top=`0`,e.appendChild(b.domElement),T=new A(l,b.domElement),T.enableDamping=!0,T.dampingFactor=.05,T.autoRotate=!0,T.autoRotateSpeed=1.5,F=pe(),P=new w(F),P.position.set(-250,0,0),c.add(P),I=new w(me()),I.position.set(280,0,0),c.add(I);let a=new O,o=[{obj:P,pos:new n(-250,0,0)},{obj:I,pos:new n(280,0,0)}];b.domElement.addEventListener(`click`,e=>{let t=b.domElement.getBoundingClientRect();a.x=(e.clientX-t.left)/t.width*2-1,a.y=-((e.clientY-t.top)/t.height)*2+1;let r=new n,i=null,s=1/0;for(let e of o){if(!e.obj.visible)continue;e.obj.getWorldPosition(r);let t=r.clone().project(l);if(t.z>1||t.z<-1)continue;let n=t.x-a.x,o=t.y-a.y,c=n*n+o*o;c<s&&(s=c,i=e)}if(i&&s<.02){let e=i.obj.rotation.y,t=0;function n(){t+=.05,t<=1&&(i.obj.rotation.y=e+Math.PI*ge(t),requestAnimationFrame(n))}n();let r=J.value&&!Y.value,a=!J.value&&Y.value;r?T.target.set(-250,0,0):a?T.target.set(280,0,0):T.target.set(0,0,0)}});let s=new Float32Array(600);for(let e=0;e<600;e+=3)s[e]=(Math.random()-.5)*2e3,s[e+1]=(Math.random()-.5)*2e3,s[e+2]=(Math.random()-.5)*1e3;let g=new d;g.setAttribute(`position`,new ie(s,3)),j=new u(g,new ae({color:6605055,size:3,transparent:!0,opacity:.6,blending:2})),c.add(j),c.add(new ne(4210752,2)),M=new h(6605055,2,1e3),M.position.set(200,200,200),c.add(M),N=new h(16737480,2,1e3),N.position.set(-200,-200,200),c.add(N),x=new z(f),x.addPass(new B(c,l)),x.addPass(new H(new O(t,r),1.5,.4,.85)),document.addEventListener(`mousemove`,he)}function pe(){let e=document.createElement(`div`);e.className=`product-card`,e.style.cssText=`width:300px;height:400px;position:relative;transform-style:preserve-3d;`,[{name:`front`,css:`translateZ(20px)`,html:`
      <div style="padding:30px;display:flex;flex-direction:column;justify-content:space-between;height:100%;">
        <div><div style="font-size:28px;font-weight:800;color:#fff;">Pro X1</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:8px;">下一代智能设备，融合前沿科技与极简美学</div></div>
        <div><div style="font-size:36px;font-weight:900;color:#64c8ff;text-shadow:0 0 20px rgba(100,200,255,0.5);">¥2,999</div>
          <button style="margin-top:12px;padding:12px 24px;background:linear-gradient(135deg,#64c8ff,#ff64c8);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(100,200,255,0.4);transition:all 0.3s;" onmouseover="this.style.boxShadow='0 8px 30px rgba(100,200,255,0.7)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 4px 20px rgba(100,200,255,0.4)';this.style.transform='none'">立即购买</button></div>
      </div>`},{name:`back`,css:`rotateY(180deg) translateZ(20px)`,html:`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.3);font-size:18px;">PRO X1</div>`},{name:`right`,css:`rotateY(90deg) translateZ(280px)`,size:`40px,400px`},{name:`left`,css:`rotateY(-90deg) translateZ(20px)`,size:`40px,400px`},{name:`top`,css:`rotateX(90deg) translateZ(20px)`,size:`300px,40px`},{name:`bottom`,css:`rotateX(-90deg) translateZ(380px)`,size:`300px,40px`}].forEach(t=>{let n=document.createElement(`div`);n.style.cssText=`position:absolute;width:${t.size?t.size.split(`,`)[0]:`300px`};height:${t.size?t.size.split(`,`)[1]:`400px`};backface-visibility:visible;border:${t.name===`front`||t.name===`back`?`1px solid rgba(255,255,255,0.1)`:`none`};transform:${t.css};border-radius:${t.name===`front`||t.name===`back`?`16px`:`0`};`,t.name===`front`?(n.style.background=`linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`,n.style.backdropFilter=`blur(10px)`,n.style.boxShadow=`inset 0 1px 0 rgba(255,255,255,0.2), 0 20px 40px rgba(0,0,0,0.4)`,n.innerHTML=t.html):t.name===`back`?(n.style.background=`linear-gradient(135deg, #1a1a2e, #16213e)`,n.innerHTML=t.html):t.name===`bottom`?(n.style.boxShadow=`0 20px 60px rgba(0,0,0,0.8)`,n.style.background=`rgba(255,255,255,0.05)`):n.style.background=`linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`,e.appendChild(n)});let t=document.createElement(`div`);return t.style.cssText=`position:absolute;width:500px;height:500px;border:2px solid rgba(100,200,255,0.2);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%) rotateX(70deg);animation:orbit 10s linear infinite;`,e.appendChild(t),e}function me(){let e=document.createElement(`div`);e.className=`glass-case`,e.style.cssText=`width:200px;height:400px;position:relative;transform-style:preserve-3d;`;let t=`1px solid rgba(255,255,255,0.12)`,n=`linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.15))`,r=document.createElement(`div`);r.style.cssText=`position:absolute;width:200px;height:400px;transform:translateZ(100px);background:${n};border:${t};border-radius:4px;`,e.appendChild(r);let i=document.createElement(`div`);i.style.cssText=`position:absolute;width:200px;height:400px;transform:rotateY(180deg) translateZ(100px);background:${n};border:${t};border-radius:4px;backdrop-filter:blur(4px);`,e.appendChild(i);let a=document.createElement(`div`);a.style.cssText=`position:absolute;width:200px;height:400px;transform:rotateY(-90deg) translateZ(100px);background:${n};border:${t};`,e.appendChild(a);let o=document.createElement(`div`);o.style.cssText=`position:absolute;width:200px;height:400px;transform:rotateY(90deg) translateZ(100px);background:${n};border:${t};`,e.appendChild(o);let s=document.createElement(`div`);s.style.cssText=`position:absolute;width:200px;height:200px;transform:rotateX(90deg) translateZ(100px);background:${n};border:${t};border-radius:4px;`,e.appendChild(s);let c=document.createElement(`div`);c.style.cssText=`
    position:absolute; width:160px; height:160px;
    left:${40/2}px; top:${40/2}px;
    transform:rotateX(90deg) translateZ(-190px);
    border-radius:50%;
    border:4px solid rgba(100,220,255,0.9);
    box-shadow:
      0 0 20px rgba(100,220,255,0.8),
      0 0 60px rgba(100,220,255,0.5),
      0 0 100px rgba(100,220,255,0.3),
      inset 0 0 15px rgba(100,220,255,0.5),
      inset 0 0 50px rgba(100,220,255,0.2);
    background:transparent;
    pointer-events:none;
    animation: ringPulse 2s ease-in-out infinite;
  `;let l=document.createElement(`div`);l.style.cssText=`
    position:absolute; width:130px; height:130px;
    left:${70/2}px; top:${70/2}px;
    transform:rotateX(90deg) translateZ(-200px);
    border-radius:50%;
    background:radial-gradient(circle, rgba(100,220,255,0.35) 0%, rgba(100,220,255,0.1) 40%, transparent 70%);
    pointer-events:none;
    animation: ringPulse 2s ease-in-out infinite 0.5s;
  `,e.appendChild(l),e.appendChild(c);let u=document.createElement(`div`);u.className=`inner-cube`,u.style.cssText=`position:absolute;width:80px;height:80px;top:${320/2}px;left:${120/2}px;transform-style:preserve-3d;animation:cubeFloat 3s ease-in-out infinite;`,[{css:`translateZ(40px)`,bg:`rgba(100,200,255,0.15)`},{css:`rotateY(180deg) translateZ(40px)`,bg:`rgba(100,200,255,0.1)`},{css:`rotateY(90deg) translateZ(40px)`,bg:`rgba(100,200,255,0.08)`},{css:`rotateY(-90deg) translateZ(40px)`,bg:`rgba(100,200,255,0.08)`},{css:`rotateX(90deg) translateZ(40px)`,bg:`rgba(100,200,255,0.12)`},{css:`rotateX(-90deg) translateZ(40px)`,bg:`rgba(100,200,255,0.12)`}].forEach(e=>{let t=document.createElement(`div`);t.style.cssText=`position:absolute;width:80px;height:80px;backface-visibility:visible;border:1px solid rgba(100,220,255,0.3);transform:${e.css};background:${e.bg};box-shadow:inset 0 0 20px rgba(100,220,255,0.1);animation:cubeGlow 2s ease-in-out infinite;`,u.appendChild(t)}),e.appendChild(u);let d=document.createElement(`div`);d.style.cssText=`position:absolute;width:200px;height:200px;transform:rotateX(-90deg) translateZ(300px);background:linear-gradient(135deg,#1a1a2e,#2a1a3e);border:1px solid rgba(100,200,255,0.15);border-radius:4px;box-shadow:0 0 30px rgba(100,200,255,0.3),inset 0 0 20px rgba(100,200,255,0.1);animation:breatheLight 2s ease-in-out infinite;display:flex;align-items:center;justify-content:center;`,e.appendChild(d);let f=document.createElement(`div`);return f.style.cssText=`position:absolute;width:500px;height:500px;border:2px solid rgba(100,200,255,0.15);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%) rotateX(75deg);animation:orbit 12s linear infinite;pointer-events:none;`,e.appendChild(f),e}function he(e){let t=e.clientX/window.innerWidth*2-1,n=-(e.clientY/window.innerHeight)*2+1;F&&(F.style.transform=`rotateX(${-n*15}deg) rotateY(${t*15}deg)`),M&&(M.position.x=t*500,M.position.y=n*500)}function ge(e){return 1-(1-e)**3}function $(){D=requestAnimationFrame($);let e=ce.getElapsedTime();L++,R===0&&(R=performance.now());let t=performance.now();t-R>=1e3&&(V.value=L,L=0,R=t,window.performance?.memory&&(G.value=window.performance.memory.usedJSHeapSize)),T.update(),j&&(j.rotation.y=e*.05,j.rotation.x=e*.02),P&&(P.position.y=Math.sin(e)*20),I&&(I.position.y=Math.sin(e)*20),M&&(M.intensity=2+Math.sin(e*2)*.5),N&&(N.intensity=2+Math.cos(e*2.3)*.5),x&&x.render(),b&&b.render(c,l)}return(e,t)=>(s(),re(`div`,U,[_(ee,null,{header:v(()=>[...t[0]||=[E(`h2`,null,`📦 CSS3D 产品展示`,-1),E(`p`,null,[E(`strong`,null,`核心展示：`),y(`6 面 CSS3D 产品卡片 + WebGL 粒子光效，双渲染器（CSS3D + WebGL）叠加。`)],-1)]]),default:v(()=>[t[2]||=E(`div`,{class:`info-grid`},[E(`div`,{class:`info-section`},[E(`div`,{class:`info-section-title`},`🎮 鼠标操作`),E(`div`,{class:`info-item`},[E(`kbd`,null,`拖拽`),y(` 旋转视角`)]),E(`div`,{class:`info-item`},[E(`kbd`,null,`滚轮`),y(` 缩放画面`)]),E(`div`,{class:`info-item`},[E(`kbd`,null,`移动鼠标`),y(` 卡片倾斜`)])]),E(`div`,{class:`info-section`},[E(`div`,{class:`info-section-title`},`✨ 效果`),E(`div`,{class:`info-item`},`Bloom 辉光后期`),E(`div`,{class:`info-item`},`双点光源脉冲`),E(`div`,{class:`info-item`},`200 粒子系统`)])],-1),E(`div`,W,[t[1]||=E(`span`,{class:`model-vis-label`},`🎯 模型显示：`,-1),E(`button`,{class:o([`model-toggle`,{active:J.value}]),onClick:le},`📦 产品卡片`,2),E(`button`,{class:o([`model-toggle`,{active:Y.value}]),onClick:ue},`🗄️ 玻璃展柜`,2)])]),_:1}),_(C,{fps:V.value,memory:G.value,objectCount:K.value,onTogglePlay:de,onUpdateSpeed:Z},null,8,[`fps`,`memory`,`objectCount`]),E(`div`,{ref_key:`containerRef`,ref:i,class:`canvas-container`},null,512)]))}},[[`__scopeId`,`data-v-0a2104d4`]]);export{G as default};