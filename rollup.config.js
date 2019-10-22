import typescript from 'rollup-plugin-typescript2';
import dts from "rollup-plugin-dts";

let override = { compilerOptions: { declaration: false } };

export default [
{
	input: './src/mixdown.ts',
    output: [
        {
            format: 'umd',
            name: 'mixdown',
            file: './dist/mixdown.js'
        }
    ],
	plugins: [
		typescript({tsconfigOverride:override})
	]
},
{
	input: './src/mixdown.ts',
    output: [
        {
            format: 'esm',
            file: './dist/mixdown.module.js'
        }
    ],
	plugins: [
        typescript({useTsconfigDeclarationDir:true})
	]
},
{
	input: './types/mixdown.d.ts',
    output: [
        {
            format: 'esm',
            file: './dist/mixdown.d.ts'
        }
    ],
	plugins: [
        dts(/*{ plugin options }*/)
	]
}
]