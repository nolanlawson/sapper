import { dev, src, dest } from './env';

export default {
	dev,

	client: {
		entry: () => {
			return {
				main: `${src}/client`
			};
		},

		output: () => {
			return {
				path: `${dest}/client`,
				filename: '[fullhash]/[name].js',
				chunkFilename: '[fullhash]/[name].[id].js',
				publicPath: `client/`
			};
		}
	},

	server: {
		entry: () => {
			return {
				server: `${src}/server`
			};
		},

		output: () => {
			return {
				path: `${dest}/server`,
				filename: '[name].js',
				chunkFilename: '[fullhash]/[name].[id].js',
				libraryTarget: 'commonjs2'
			};
		}
	},

	serviceworker: {
		entry: () => {
			return {
				'service-worker': `${src}/service-worker`
			};
		},

		output: () => {
			return {
				path: dest,
				filename: '[name].js',
				chunkFilename: '[name].[id].[fullhash].js'
			}
		}
	}
};