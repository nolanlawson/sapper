const fs = require('fs');
const path = require('path');
const glob = require('glob');
const templates = require('../templates.js');
const route_manager = require('../route_manager.js');
const { dest, dev } = require('../config.js');
const etag = require('etag');

function ensure_array(thing) {
	return Array.isArray(thing) ? thing : [thing]; // omg webpack what the HELL are you doing
}

module.exports = function generate_asset_cache(clientInfo, serverInfo) {
	const main_assets = ensure_array(clientInfo.assetsByChunkName.main);
	const main_css_asset = main_assets.find(_ => _.endsWith('.css'))
	const main_js_asset = main_assets.find(_ => _.endsWith('.js'))
	const main_css_file = `/client/${main_css_asset}`;
	const main_css_file_content = main_css_asset && read(`${dest}${main_css_file}`)
	const main_js_file = `/client/${main_js_asset}`;

	const chunk_files = clientInfo.assets.map(chunk => `/client/${chunk.name}`);

	const service_worker = generate_service_worker(chunk_files);
	const index = generate_index(main_js_file, main_css_file_content);

	if (dev) {
		fs.writeFileSync(path.join(dest, 'service-worker.js'), service_worker);
		fs.writeFileSync(path.join(dest, 'index.html'), index);
	}

	return {
		client: {
			main_file: main_js_file,
			main_css_file_content,
			chunk_files,

			main: read(`${dest}${main_js_file}`),
			chunks: chunk_files.reduce((lookup, file) => {
				const content = read(`${dest}${file}`);
				const buff = Buffer.from(content, 'utf-8');
				lookup[file] = {
					length: buff.length,
					etag: etag(buff),
					content
				};
				return lookup;
			}, {}),

			routes: route_manager.routes.reduce((lookup, route) => {
				const route_assets = ensure_array(clientInfo.assetsByChunkName[route.id]);
				const js_asset = route_assets.find(_ => _.endsWith('.js'));
				const css_asset = route_assets.find(_ => _.endsWith('.css'));
				lookup[route.id] = {
					js: `/client/${js_asset}`,
					css: css_asset && `/client/${css_asset}`
				};
				return lookup;
			}, {}),

			index,
			service_worker
		},

		server: {
			entry: path.resolve(dest, 'server', serverInfo.assetsByChunkName.main)
		}
	};
};

function generate_service_worker(chunk_files) {
	const assets = glob.sync('**', { cwd: 'assets', nodir: true });

	const route_code = `[${
		route_manager.routes
			.filter(route => route.type === 'page')
			.map(route => `{ pattern: ${route.pattern} }`)
			.join(', ')
	}]`;

	const content = read('templates/service-worker.js')
		.replace(/__timestamp__/g, process.env.NOW_URL || Date.now())
		.replace(/__assets__/g, JSON.stringify(assets))
		.replace(/__shell__/g, JSON.stringify(chunk_files.concat('/index.html')))
		.replace(/__routes__/g, route_code);
	const buff = Buffer.from(content, 'utf8');
	return {
		length: buff.length,
		etag: etag(buff),
		content
	};
}

function generate_index(main_js_file, main_css_file_content) {
	const content = templates.render(200, {
		// main.css has to be loaded here because this appears for cached SW loads
		styles: main_css_file_content && `<style>${main_css_file_content}</style>`,
		head: '',
		html: '<noscript>Please enable JavaScript!</noscript>',
		main: main_js_file
	});
	const buff = Buffer.from(content, 'utf8');
	return {
		length: buff.length,
		etag: etag(buff),
		content
	};
}

function read(file) {
	return fs.readFileSync(file, 'utf-8');
}
