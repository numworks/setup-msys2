const core = require('@actions/core');
const io = require('@actions/io');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const path = require('path');
const fs = require('fs');

async function run() {
  try {
    if (process.platform != 'win32') {
      core.setFailed("MSYS2 does not work on non-windows platforms; please check the 'runs-on' field of the job");
    }

    const tar = await io.which('tar', true);

    const tmp_dir = process.env['RUNNER_TEMP']
    if (!tmp_dir) {
      core.setFailed('environment variable RUNNER_TEMP is undefined');
      return
    }
    const dest = path.join(tmp_dir, 'msys')

    await io.mkdirP(dest)

    await exec.exec(`"${tar}"`, [
      '-x', '-J', '--force-local',
      // For some reason, GNU Tar on Windows expects paths to be slash-separated
      '-C', dest.replace(/\\/g, '/'),
      '-f', await tc.downloadTool('http://repo.msys2.org/distrib/x86_64/msys2-base-x86_64-20190524.tar.xz')
    ])

    let cmd = path.join(dest, 'msys2do.cmd')
    fs.writeFileSync(cmd, ['setlocal', 'set MSYS2_PATH_TYPE=strict', `%~dp0\\msys64\\usr\\bin\\bash.exe -lc "cd $OLDPWD && %*"`].join('\n\r'))

    core.addPath(dest);

    core.exportVariable('MSYSTEM', core.getInput('msystem'));

    core.startGroup('Starting MSYS2 for the first time...')
      // For some reason, `msys2do` does not work
      await exec.exec(`"${cmd}"`, ['uname', '-a'])
    core.endGroup()
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
