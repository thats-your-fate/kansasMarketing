// Keep immutable build seeds readable while storing all incremental cache
// writes outside the release. Local builds retain Next's default filesystem.
const path = require('node:path')
const fs = require('node:fs')
const { randomUUID } = require('node:crypto')
const FileSystemCache = require('next/dist/server/lib/incremental-cache/file-system-cache').default

function overlayFilesystem(original, serverDistDir, cacheDir) {
  const root = path.resolve(serverDistDir, '..')
  const destination = path.resolve(cacheDir)
  if (!path.isAbsolute(cacheDir) || destination === root || destination.startsWith(root + path.sep)) throw Error('Cache must be external to the immutable release')
  const mapped = file => {
    const relative = path.relative(root, path.resolve(file))
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error('Cache path escapes the build directory')
    return path.join(destination, relative)
  }
  const read = (method, file, ...args) => {
    try { return original[method](mapped(file), ...args) } catch (error) {
      if (error.code !== 'ENOENT') throw error
      return original[method](file, ...args)
    }
  }
  const readAsync = async (method, file, ...args) => {
    try { return await original[method](mapped(file), ...args) } catch (error) {
      if (error.code !== 'ENOENT') throw error
      return original[method](file, ...args)
    }
  }
  return {
    existsSync: file => original.existsSync(mapped(file)) || original.existsSync(file),
    readFileSync: (file, ...args) => read('readFileSync', file, ...args),
    readFile: (file, ...args) => readAsync('readFile', file, ...args),
    stat: file => readAsync('stat', file),
    mkdir: file => original.mkdir(mapped(file)),
    writeFile: (file, data) => original.writeFile(mapped(file), data),
    writeFileAtomic: async (file, data) => {
      const target = mapped(file), temporary = `${target}.${randomUUID()}.tmp`
      try {
        await fs.promises.writeFile(temporary, data)
        await fs.promises.link(temporary, target)
        return true
      } catch (error) {
        if (error.code === 'EEXIST') return false
        throw error
      } finally { await fs.promises.unlink(temporary).catch(() => {}) }
    },
  }
}

module.exports = class ExternalCache extends FileSystemCache {
  constructor(context) {
    const directory = process.env.KS_EXTERNAL_CACHE_DIR
    super(directory ? { ...context, fs: overlayFilesystem(context.fs, context.serverDistDir, directory) } : context)
  }
}
module.exports.overlayFilesystem = overlayFilesystem
