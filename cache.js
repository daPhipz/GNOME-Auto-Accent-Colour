import Gio from 'gi://Gio'
import GLib from 'gi://GLib'

import { journal } from './utils.js'

function getExtensionCacheDir() {
    return `${GLib.get_home_dir()}/.cache/auto-accent-colour`
}

// fake cache that does nothing
// serves as an interface reference
// but can also be used to disable caching
// (also ya... i can do oop js... for sure...)
function noCache() {
    function get(key) { return null; }
    function set(key, data) { }
    // function delete ...
    // function clear ...
    return { get: get, set: set };
}

// simple file-based cache
// TODO: make it async? I'm not great at this and the docs seem a little off?
function fileBasedCache(cachedir) {
    function _setup() {
        journal(`Ensuring cache directory ${cachedir} exists...`);
        GLib.mkdir_with_parents(cachedir, 0o0755);
    }
    function _file(key) {
        return Gio.File.new_for_path(`${cachedir}/${key}`);
    }
    function get(key) {
        const file = _file(key);
        if (!file.query_exists(null)) {
            return null;
        }
        journal(`Reading cache entry from ${file.get_path()}...`);
        const [_ok, contents, _etag] = file.load_contents(null);
        const decoder = new TextDecoder('utf-8');
        const contentsString = decoder.decode(contents);
        try {
            return JSON.parse(contentsString);
        } catch (err) {
            journal(`unable to parse ${file.get_path()}: ${err}`);
            return null;
        }
    }
    function set(key, data) {
        const file = _file(key);
        journal(`Writing cache entry to ${file.get_path()}...`);
        const cereal = JSON.stringify(data);
        const bytes = new GLib.Bytes(cereal);
        const stream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
        stream.write_bytes(bytes, null);
    }
    // function delete ...
    // function clear ...
    _setup();
    return { get: get, set: set };
}

export {
    getExtensionCacheDir,
    noCache,
    fileBasedCache,
}
