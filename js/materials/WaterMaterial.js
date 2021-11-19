"use strict"

import { DoubleSide, ShaderMaterial } from "../lib/three.module.js";

export default class WaterMaterial extends ShaderMaterial {

    constructor(normalmap, flowMap, alphaMap) {

        const vertexShader =/*glsl*/ `

            precision mediump float;

            uniform vec3 sunPosition;
            uniform float PI;
            uniform float time;

            varying vec2 texcoord;
            out vec3 pos;
            out vec3 sunPos;

            const float timeSpeed = 0.00004;
            const float waveSpeed = 5.0;
            const float waveFrequency = 2.0;
            const float offsetAmplitude = 0.3;

            float modulo(float a, float b) {
                return a - (b * floor(a/b));
            }

            void main() {

                pos = cameraPosition - position;

                sunPos = sunPosition - position;

                texcoord = uv.xy;

                float timeCycle = 2.0 * PI * modulo(time * timeSpeed, 1.0);
                float offset = sin(timeCycle * waveSpeed + position.x * waveFrequency) * offsetAmplitude;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, position.y, position.z + offset, 1.0);

            }
        `
        const fragmentShader =/*glsl*/ `

            precision mediump float;

            uniform float time;
            uniform sampler2D normalmap;
            uniform sampler2D flowMap;
            uniform sampler2D alphaMap;
            uniform vec3 sunPosition;

            varying vec2 texcoord;
            in vec3 pos;
            in vec3 sunPos;

            const vec3 color = vec3(0.604, 0.867, 0.851);
            const float shininess = 20.0;
            const vec3 specularColor = vec3(0.2, 0.2, 0.2);
            const float timeSpeed = 0.0002;
            const float alphaSpeed = 0.05;
            const float fidelity = 12.0;

            float modulo(float a, float b) {
                return a - (b * floor(a/b));
            }

            vec3 totalColor(vec3 normal) {
                vec3 lightDirection = normalize(sunPos);
                float lambertian = clamp(dot(lightDirection, normal), 0.0, 1.0);

                vec3 reflectDirection = normalize(reflect(-lightDirection, normal));
                vec3 viewDirection = normalize(-pos);

                vec3 ambient = 0.2 * color;
                float specular = 0.0;
                if (lambertian > 0.0) {
                    float specAngle = max(dot(reflectDirection, viewDirection), 0.0);
                    specular = pow(specAngle, shininess);
                }

                return ambient + (lambertian * color) + (specular * specularColor);
            }

            void main() {

                vec2 tex = vec2((sin(texcoord.x * fidelity) + 1.0) / 2.0, (sin(texcoord.y * fidelity) + 1.0) / 2.0);

                float timeShift = time * timeSpeed;
                float t1 = modulo(timeShift, 1.0);
                float t2 = modulo(t1 - 0.5, 1.0);
                vec2 fd = (texture(flowMap, tex).rg - 0.5) * 2.0;
                vec2 fd1 = fd * t1;
                vec2 fd2 = fd * t2;
                vec2 coord1 = tex + fd1;
                vec2 coord2 = tex + fd2;
                vec3 n1 = texture(normalmap, coord1).xyz;
                vec3 n2 = texture(normalmap, coord2).xyz;
                float mixFactor = abs(t1 - 0.5) * 2.0;
                vec3 normal = normalize(mix(n1, n2, mixFactor));

                float ax = modulo(tex.x + timeShift * alphaSpeed, 1.0);
                float ay = modulo(tex.y + timeShift * alphaSpeed, 1.0);
                float a = texture(alphaMap, vec2(ax,ay)).x;
                float alpha = clamp(a, 0.5, 0.6);

                // Final output
                gl_FragColor = vec4(totalColor(normal), alpha);

            }
        `

        super({        
            side: DoubleSide,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,

            uniforms: {
                time: { value: 0 },
                nomalmap: { value: normalmap },
                flowMap: { value: flowMap },
                alphaMap: { value: alphaMap },
                PI: { value: Math.PI },
                sunPosition: { value: [10, 500, 0] }
            }
        });
        
    }
    
}