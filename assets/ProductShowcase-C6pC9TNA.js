import{$r as e,Br as t,G as n,Gn as r,Ht as i,Jr as a,Kn as o,L as s,Lt as c,Qr as l,Rt as u,Si as d,Ut as f,Vt as p,Zr as m,ai as h,br as g,bt as _,c as ee,dr as v,hi as te,i as ne,ir as y,l as b,li as re,m as x,n as ie,p as ae,si as oe,t as se,vi as S,wr as C,xr as w,xt as T}from"./ControlPanel-DfFi7HYo.js";import{i as ce,n as le,r as ue,t as E}from"./index-DWIK97LI.js";var D={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`},O=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},k=new c(-1,1,1,-1,0,1),A=new class extends b{constructor(){super(),this.setAttribute(`position`,new s([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new s([0,2,0,0,2,0],2))}},j=class{constructor(e){this._mesh=new _(A,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,k)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},M=class extends O{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof o?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=v.clone(e.uniforms),this.material=new o({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new j(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},N=class extends O{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},P=class extends O{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},de=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let r=e.getSize(new g);this._width=r.width,this._height=r.height,t=new C(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:n}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new M(D),this.copyPass.material.blending=0,this.timer=new y}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}N!==void 0&&(r instanceof N?n=!0:r instanceof P&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new g);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},fe=class extends O{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new x}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},F={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new x(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`},I=class e extends O{constructor(e,t=1,r,i){super(),this.strength=t,this.radius=r,this.threshold=i,this.resolution=e===void 0?new g(256,256):new g(e.x,e.y),this.clearColor=new x(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let a=Math.round(this.resolution.x/2),s=Math.round(this.resolution.y/2);this.renderTargetBright=new C(a,s,{type:n}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new C(a,s,{type:n});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let r=new C(a,s,{type:n});r.texture.name=`UnrealBloomPass.v`+e,r.texture.generateMipmaps=!1,this.renderTargetsVertical.push(r),a=Math.round(a/2),s=Math.round(s/2)}let c=F;this.highPassUniforms=v.clone(c.uniforms),this.highPassUniforms.luminosityThreshold.value=i,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new o({uniforms:this.highPassUniforms,vertexShader:c.vertexShader,fragmentShader:c.fragmentShader}),this.separableBlurMaterials=[];let l=[6,10,14,18,22];a=Math.round(this.resolution.x/2),s=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(l[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new g(1/a,1/s),a=Math.round(a/2),s=Math.round(s/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let u=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=u,this.bloomTintColors=[new w(1,1,1),new w(1,1,1),new w(1,1,1),new w(1,1,1),new w(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=v.clone(D.uniforms),this.blendMaterial=new o({uniforms:this.copyUniforms,vertexShader:D.vertexShader,fragmentShader:D.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new x,this._oldClearAlpha=1,this._basic=new T,this._fsQuad=new j(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new g(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(n*n))/n);return new o({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new g(.5,.5)},direction:{value:new g(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`

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

				}`})}_getCompositeMaterial(e){return new o({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

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

				}`})}};I.BlurDirectionX=new g(1,0),I.BlurDirectionY=new g(0,1);var pe={class:`product-page`},me={class:`model-vis-row`},L=t({__name:`ProductShowcase`,emits:[`switchModel`],setup(t,{emit:n}){let o=S(null),s,c,_,v,y,C,T,D,O,k,A,j,M,N=0,P=0,F={bursting:!1,burstStart:0,burstDuration:0,flickerSpeed:0,nextTrigger:3},L=S(0),R=S(0),he=S(1),z=S(!0),ge=S(1),B=S(!0),V=S(!0),H=S(1),U=S(1),W=S(`#64dcff`),G=S(`#64dcff`),_e=new ae,K,q,ve=[],J,Y,X;function ye(){B.value=!B.value,A&&(A.visible=B.value),xe()}function be(){V.value=!V.value,M&&(M.visible=V.value),xe()}function xe(){let e=0;B.value&&e++,V.value&&e++,he.value=e}function Z(e,t){e!==void 0&&(H.value=e),t!==void 0&&(W.value=t);let n=H.value,r=t||W.value;if(j){if(j.backLight){let e=new x(r);j.backLight.style.opacity=.75*n,j.backLight.style.background=`linear-gradient(135deg, rgba(${e.r*255|0},${e.g*255|0},${e.b*255|0},${.35*n}), rgba(${e.r*255|0},${e.g*255|0},${e.b*255|0},${.2*n}))`,j.backLight.style.boxShadow=`0 0 120px rgba(${e.r*255|0},${e.g*255|0},${e.b*255|0},${.5*n}), inset 0 0 100px rgba(${e.r*255|0},${e.g*255|0},${e.b*255|0},${.35*n})`}if(j.frontGlow){let e=new x(r);j.frontGlow.style.opacity=.35*n,j.frontGlow.style.background=`linear-gradient(135deg, rgba(${e.r*255|0},${e.g*255|0},${e.b*255|0},${.15*n}), rgba(${e.r*255|0},${e.g*255|0},${e.b*255|0},${.08*n}))`,j.frontGlow.style.boxShadow=`inset 0 0 80px rgba(${e.r*255|0},${e.g*255|0},${e.b*255|0},${.2*n})`}}}function Q(e,t){e!==void 0&&(U.value=e),t!==void 0&&(G.value=t);let n=U.value,r=new x(t||G.value),i=r.r*255|0,a=r.g*255|0,o=r.b*255|0,s=`rgba(${i},${a},${o}`;document.documentElement.style.setProperty(`--gr`,i),document.documentElement.style.setProperty(`--gg`,a),document.documentElement.style.setProperty(`--gb`,o),K&&(K.style.borderColor=`${s},${.9*n})`,K.style.boxShadow=`0 0 ${20*n}px ${s},${.8*n}), 0 0 ${60*n}px ${s},${.5*n}), 0 0 ${100*n}px ${s},${.3*n}), inset 0 0 ${15*n}px ${s},${.5*n}), inset 0 0 ${50*n}px ${s},${.2*n})`),q&&(q.style.background=`radial-gradient(circle, ${s},${.35*n}) 0%, ${s},${.1*n}) 40%, transparent 70%)`),ve.forEach((e,t)=>{let r=[.15,.1,.08,.08,.12,.12];e.style.background=`${s},${r[t]||.1})`,e.style.borderColor=`${s},${.3*n})`,e.style.boxShadow=`inset 0 0 20px ${s},${.1*n})`}),J&&(J.style.borderColor=`${s},${.15*n})`,J.style.boxShadow=`0 0 ${30*n}px ${s},${.3*n}), inset 0 0 ${20*n}px ${s},${.1*n})`),Y&&(Y.style.color=`${s},${.4*n})`),X&&(X.style.borderColor=`${s},${.15*n})`)}function Se(){Z(1,`#64dcff`),Q(1,`#64dcff`)}function Ce(e){z.value=e,C&&(C.autoRotate=e)}function we(e){ge.value=e,C&&(C.autoRotateSpeed=e*1.5)}function Te(e){(e.key===` `||e.code===`Space`)&&(e.preventDefault(),z.value=!z.value,C&&(C.autoRotate=z.value))}oe(()=>{Ee(),$(),window.addEventListener(`keydown`,Te)}),h(()=>{window.removeEventListener(`keydown`,Te),T&&cancelAnimationFrame(T),T&&cancelAnimationFrame(T),C?.dispose(),_?.dispose(),v?.domElement?.parentNode&&v.domElement.parentNode.removeChild(v.domElement),_?.domElement?.parentNode&&_.domElement.parentNode.removeChild(_.domElement)});function Ee(){let e=o.value,t=e.clientWidth,n=e.clientHeight;s=new r,s.background=new x(657930),c=new u(50,t/n,1,5e3),c.position.set(0,0,800),_=new ce({antialias:!0,alpha:!0}),_.setSize(t,n),_.setPixelRatio(Math.min(window.devicePixelRatio,2)),_.domElement.style.position=`absolute`,_.domElement.style.top=`0`,_.domElement.style.pointerEvents=`none`,e.appendChild(_.domElement),v=new le,v.setSize(t,n),v.domElement.style.position=`absolute`,v.domElement.style.top=`0`,e.appendChild(v.domElement),C=new ue(c,v.domElement),C.enableDamping=!0,C.dampingFactor=.05,C.autoRotate=!0,C.autoRotateSpeed=1.5,j=De(),A=new E(j),A.position.set(-250,0,0),s.add(A),M=new E(Oe()),M.position.set(280,0,0),s.add(M);let a=new g,l=[{obj:A,pos:new w(-250,0,0)},{obj:M,pos:new w(280,0,0)}];v.domElement.addEventListener(`click`,e=>{let t=v.domElement.getBoundingClientRect();a.x=(e.clientX-t.left)/t.width*2-1,a.y=-((e.clientY-t.top)/t.height)*2+1;let n=new w,r=null,i=1/0;for(let e of l){if(!e.obj.visible)continue;e.obj.getWorldPosition(n);let t=n.clone().project(c);if(t.z>1||t.z<-1)continue;let o=t.x-a.x,s=t.y-a.y,l=o*o+s*s;l<i&&(i=l,r=e)}if(r&&i<.02){let e=r.obj.rotation.y,t=0;function n(){t+=.05,t<=1&&(r.obj.rotation.y=e+Math.PI*Ae(t),requestAnimationFrame(n))}n();let i=B.value&&!V.value,a=!B.value&&V.value;i?C.target.set(-250,0,0):a?C.target.set(280,0,0):C.target.set(0,0,0)}});let d=new Float32Array(600);for(let e=0;e<600;e+=3)d[e]=(Math.random()-.5)*2e3,d[e+1]=(Math.random()-.5)*2e3,d[e+2]=(Math.random()-.5)*1e3;let m=new b;m.setAttribute(`position`,new ee(d,3)),D=new i(m,new f({color:6605055,size:3,transparent:!0,opacity:.6,blending:2})),s.add(D),s.add(new ne(4210752,2)),O=new p(6605055,2,1e3),O.position.set(200,200,200),s.add(O),k=new p(16737480,2,1e3),k.position.set(-200,-200,200),s.add(k),y=new de(_),y.addPass(new fe(s,c)),y.addPass(new I(new g(t,n),1.5,.4,.85)),document.addEventListener(`mousemove`,ke)}function De(){let e=document.createElement(`div`);e.className=`product-card`,e.style.cssText=`width:300px;height:400px;position:relative;transform-style:preserve-3d;`,[{name:`front`,css:`translateZ(20px)`,html:`
      <div style="padding:30px;display:flex;flex-direction:column;justify-content:space-between;height:100%;">
        <div><div style="font-size:28px;font-weight:800;color:#fff;">Pro X1</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:8px;">下一代智能设备，融合前沿科技与极简美学</div></div>
        <div><div style="font-size:36px;font-weight:900;color:#64c8ff;text-shadow:0 0 20px rgba(100,200,255,0.5);">¥2,999</div>
          <button style="margin-top:12px;padding:12px 24px;background:linear-gradient(135deg,#64c8ff,#ff64c8);border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(100,200,255,0.4);transition:all 0.3s;" onmouseover="this.style.boxShadow='0 8px 30px rgba(100,200,255,0.7)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 4px 20px rgba(100,200,255,0.4)';this.style.transform='none'">立即购买</button></div>
      </div>`},{name:`back`,css:`rotateY(180deg) translateZ(20px)`,html:`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.3);font-size:18px;">PRO X1</div>`},{name:`right`,css:`rotateY(90deg) translateZ(280px)`,size:`40px,400px`},{name:`left`,css:`rotateY(-90deg) translateZ(20px)`,size:`40px,400px`},{name:`top`,css:`rotateX(90deg) translateZ(20px)`,size:`300px,40px`},{name:`bottom`,css:`rotateX(-90deg) translateZ(380px)`,size:`300px,40px`}].forEach(t=>{let n=document.createElement(`div`);if((t.name===`front`||t.name===`back`)&&n.setAttribute(`data-face`,t.name),n.style.cssText=`position:absolute;width:${t.size?t.size.split(`,`)[0]:`300px`};height:${t.size?t.size.split(`,`)[1]:`400px`};backface-visibility:visible;border:${t.name===`front`||t.name===`back`?`1px solid rgba(255,255,255,0.1)`:`none`};transform:${t.css};border-radius:${t.name===`front`||t.name===`back`?`16px`:`0`};`,t.name===`front`)n.style.background=`linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`,n.style.backdropFilter=`blur(10px)`,n.style.boxShadow=`inset 0 1px 0 rgba(255,255,255,0.2), 0 20px 40px rgba(0,0,0,0.4)`,n.innerHTML=t.html;else if(t.name===`back`){n.style.background=`linear-gradient(135deg, #1a1a2e, #16213e)`,n.innerHTML=t.html;let r=document.createElement(`div`);r.style.cssText=`position:absolute;inset:0;border-radius:16px;pointer-events:none;opacity:0.75;transition:none;
        background:linear-gradient(135deg, rgba(100,220,255,0.35), rgba(80,180,255,0.2));
        box-shadow:0 0 120px rgba(100,220,255,0.5), inset 0 0 100px rgba(100,220,255,0.35);`,n.appendChild(r),e.backLight=r;let i=document.createElement(`div`);i.style.cssText=`position:absolute;inset:0;border-radius:16px;pointer-events:none;opacity:0.35;transition:none;
        background:linear-gradient(135deg, rgba(100,220,255,0.15), rgba(80,180,255,0.08));
        box-shadow:inset 0 0 80px rgba(100,220,255,0.2);`,e.frontGlow=i,setTimeout(()=>{let t=e.querySelector(`[data-face="front"]`);t&&t.appendChild(i)},0)}else t.name===`bottom`?(n.style.boxShadow=`0 20px 60px rgba(0,0,0,0.8)`,n.style.background=`rgba(255,255,255,0.05)`):n.style.background=`linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`;e.appendChild(n)});let t=document.createElement(`div`);return t.style.cssText=`position:absolute;width:500px;height:500px;border:2px solid rgba(100,200,255,0.2);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%) rotateX(70deg);animation:orbit 10s linear infinite;`,e.appendChild(t),e}function Oe(){let e=document.createElement(`div`);e.className=`glass-case`,e.style.cssText=`width:200px;height:400px;position:relative;transform-style:preserve-3d;`;let t=`1px solid rgba(255,255,255,0.12)`,n=`linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.15))`,r=document.createElement(`div`);r.style.cssText=`position:absolute;width:200px;height:400px;transform:translateZ(100px);background:${n};border:${t};border-radius:4px;`,e.appendChild(r);let i=document.createElement(`div`);i.style.cssText=`position:absolute;width:200px;height:400px;transform:rotateY(180deg) translateZ(100px);background:${n};border:${t};border-radius:4px;`,e.appendChild(i);let a=document.createElement(`div`);a.style.cssText=`position:absolute;width:200px;height:400px;transform:rotateY(-90deg) translateZ(100px);background:${n};border:${t};`,e.appendChild(a);let o=document.createElement(`div`);o.style.cssText=`position:absolute;width:200px;height:400px;transform:rotateY(90deg) translateZ(100px);background:${n};border:${t};`,e.appendChild(o);let s=document.createElement(`div`);s.style.cssText=`position:absolute;width:200px;height:200px;transform:rotateX(90deg) translateZ(100px);background:${n};border:${t};border-radius:4px;`,e.appendChild(s);let c=document.createElement(`div`);c.style.cssText=`
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
  `,e.appendChild(l),e.appendChild(c),K=c,q=l;let u=document.createElement(`div`);u.className=`inner-cube`,u.style.cssText=`position:absolute;width:80px;height:80px;top:${320/2}px;left:${120/2}px;transform-style:preserve-3d;animation:cubeFloat 3s ease-in-out infinite;`;let d=[{css:`translateZ(40px)`,bg:`rgba(100,200,255,0.15)`},{css:`rotateY(180deg) translateZ(40px)`,bg:`rgba(100,200,255,0.1)`},{css:`rotateY(90deg) translateZ(40px)`,bg:`rgba(100,200,255,0.08)`},{css:`rotateY(-90deg) translateZ(40px)`,bg:`rgba(100,200,255,0.08)`},{css:`rotateX(90deg) translateZ(40px)`,bg:`rgba(100,200,255,0.12)`},{css:`rotateX(-90deg) translateZ(40px)`,bg:`rgba(100,200,255,0.12)`}],f=[];d.forEach(e=>{let t=document.createElement(`div`);t.style.cssText=`position:absolute;width:80px;height:80px;backface-visibility:visible;border:1px solid rgba(100,220,255,0.3);transform:${e.css};background:${e.bg};box-shadow:inset 0 0 20px rgba(100,220,255,0.1);animation:cubeGlow 2s ease-in-out infinite;`,u.appendChild(t),f.push(t)}),e.appendChild(u),ve=f;let p=document.createElement(`div`);p.style.cssText=`position:absolute;width:200px;height:200px;transform:rotateX(-90deg) translateZ(300px);background:linear-gradient(135deg,#1a1a2e,#2a1a3e);border:1px solid rgba(100,200,255,0.15);border-radius:4px;box-shadow:0 0 30px rgba(100,200,255,0.3),inset 0 0 20px rgba(100,200,255,0.1);animation:breatheLight 2s ease-in-out infinite;display:flex;align-items:center;justify-content:center;`;let m=document.createElement(`span`);m.style.cssText=`font-size:10px;color:rgba(100,200,255,0.4);text-align:center;line-height:1.4;pointer-events:none;`,p.appendChild(m),e.appendChild(p),J=p,Y=m;let h=document.createElement(`div`);return h.style.cssText=`position:absolute;width:500px;height:500px;border:2px solid rgba(100,200,255,0.15);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%) rotateX(75deg);animation:orbit 12s linear infinite;pointer-events:none;`,e.appendChild(h),X=h,e}function ke(e){let t=e.clientX/window.innerWidth*2-1,n=-(e.clientY/window.innerHeight)*2+1;j&&(j.style.transform=`rotateX(${-n*15}deg) rotateY(${t*15}deg)`),O&&(O.position.x=t*500,O.position.y=n*500)}function Ae(e){return 1-(1-e)**3}function $(){T=requestAnimationFrame($);let e=_e.getElapsedTime();N++,P===0&&(P=performance.now());let t=performance.now();if(t-P>=1e3&&(L.value=N,N=0,P=t,window.performance?.memory&&(R.value=window.performance.memory.usedJSHeapSize)),C.update(),D&&(D.rotation.y=e*.05,D.rotation.x=e*.02),A&&(A.position.y=Math.sin(e)*20),M&&(M.position.y=Math.sin(e)*20),O&&(O.intensity=2+Math.sin(e*2)*.5),k&&(k.intensity=2+Math.cos(e*2.3)*.5),j&&j.backLight)if(!F.bursting&&e>F.nextTrigger&&(F.bursting=!0,F.burstStart=e,F.burstDuration=.2+Math.random()*3,F.flickerSpeed=20+Math.random()*50,F.nextTrigger=e+6+Math.random()*6),F.bursting){let t=e-F.burstStart;if(t<F.burstDuration){let e=Math.sin(t*F.flickerSpeed)*.4+Math.sin(t*(F.flickerSpeed*.53))*.3+Math.sin(t*(F.flickerSpeed*.17))*.2+Math.random()*.25>.3;j.backLight.style.opacity=e?.75*H.value:.05+Math.random()*.1,j.frontGlow&&(j.frontGlow.style.opacity=e?.35*H.value:.02+Math.random()*.04)}else F.bursting=!1}else j.backLight.style.opacity=.75*H.value,j.frontGlow&&(j.frontGlow.style.opacity=.35*H.value);y&&y.render(),v&&v.render(s,c)}return(t,n)=>(re(),m(`div`,pe,[e(ie,null,{header:te(()=>[...n[4]||=[a(`h2`,null,`📦 CSS3D 产品展示`,-1),a(`p`,null,[a(`strong`,null,`核心展示：`),l(`6 面 CSS3D 产品卡片 + WebGL 粒子光效，双渲染器（CSS3D + WebGL）叠加。`)],-1)]]),default:te(()=>[n[6]||=a(`div`,{class:`info-grid`},[a(`div`,{class:`info-section`},[a(`div`,{class:`info-section-title`},`🎮 鼠标操作`),a(`div`,{class:`info-item`},[a(`kbd`,null,`拖拽`),l(` 旋转视角`)]),a(`div`,{class:`info-item`},[a(`kbd`,null,`滚轮`),l(` 缩放画面`)]),a(`div`,{class:`info-item`},[a(`kbd`,null,`移动鼠标`),l(` 卡片倾斜`)])]),a(`div`,{class:`info-section`},[a(`div`,{class:`info-section-title`},`✨ 效果`),a(`div`,{class:`info-item`},`Bloom 辉光后期`),a(`div`,{class:`info-item`},`双点光源脉冲`),a(`div`,{class:`info-item`},`200 粒子系统`)])],-1),a(`div`,me,[n[5]||=a(`span`,{class:`model-vis-label`},`🎯 模型显示：`,-1),a(`button`,{class:d([`model-toggle`,{active:B.value}]),onClick:ye},`📦 产品卡片`,2),a(`button`,{class:d([`model-toggle`,{active:V.value}]),onClick:be},`🗄️ 玻璃展柜`,2)])]),_:1}),e(se,{fps:L.value,memory:R.value,objectCount:he.value,showModelLights:!0,cardBrightness:H.value,glassBrightness:U.value,cardColor:W.value,glassColor:G.value,onTogglePlay:Ce,onUpdateSpeed:we,onUpdateCardBrightness:n[0]||=e=>Z(e,void 0),onUpdateGlassBrightness:n[1]||=e=>Q(e,void 0),onUpdateCardColor:n[2]||=e=>Z(void 0,e),onUpdateGlassColor:n[3]||=e=>Q(void 0,e),onResetLights:Se},null,8,[`fps`,`memory`,`objectCount`,`cardBrightness`,`glassBrightness`,`cardColor`,`glassColor`]),a(`div`,{ref_key:`containerRef`,ref:o,class:`canvas-container`},null,512)]))}},[[`__scopeId`,`data-v-1930b19c`]]);export{L as default};