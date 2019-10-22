import typescript from 'rollup-plugin-typescript2';

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
		typescript(/*{ plugin options }*/)
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
		typescript(/*{ plugin options }*/)
	]
}
]