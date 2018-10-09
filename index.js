'use strict';

const cp = require('child_process');

const sprintf = require('nyks/string/format');
const defer   = require('nyks/promise/defer');
const drain   = require('nyks/stream/drain');

const splitArgs  = require('nyks/process/splitArgs');
const formatArgs = require('nyks/process/formatArgs');

class whiptail {


  constructor(options) {
    this.options = formatArgs(options, true);

    //notags is not working as it should
    //https://bugzilla.redhat.com/show_bug.cgi?id=1215239
    var rekey = function(choices) {
      var out = {map : {}, rmap : {}};
      var i = 0;
      for(var k in choices) {
        out.map[sprintf('%d)', ++i)] = choices[k];
        out.rmap[sprintf('%d)', i)]  = k;
      }
      return out;
    };

    if(options && options.notags) {
      var checklist = this.checklist;
      this.checklist = async(title, choices) => {
        var tmp = rekey(choices);
        var results = await checklist.call(this, title, tmp.map);
        if(Array.isArray(results))
          for(var k in results)
            results[k] = tmp.rmap[results[k]];
        else results = tmp.rmap[results];
        return results;
      };
    }

    this._program = options.program || 'whiptail';

  }

  async inputbox(title, init, {
    width = 0, height = 0,
  } = {}) {
    var args = ['--inputbox', title];
    args.push(height, width, init || '');

    try {
      return await this._run(args);
    } catch(err) {
      return null;
    }
  }

  async pssswordbox(title, init, {
    width = 0, height = 0,
  } = {}) {
    var args = ['--passwordbox', title];
    args.push(height, width, init || '');

    try {
      return await this._run(args);
    } catch(err) {
      return null;
    }
  }

  async msgbox(text, {
    width = 0, height = 0,
  } = {}) {
    var args = ['--msgbox', text];
    args.push(height, width);

    try {
      return await this._run(args);
    } catch(err) {
      return null;
    }
  }

  async  menu(title, choices, def, {
    width = 0, height = 0, menuHeight = 0,
  } = {}) {
    var args = ['--menu', title];
    if(def !== undefined)
      args.push("--default-item", def);

    args.push(height, width, menuHeight);
    for(var k in choices)
      args.push(k, choices[k]);

    try {
      return await this._run(args);
    } catch(err) {
      return null;
    }
  }

  async  radiolist(title, choices, {
    width = 0, height = 0, menuHeight = 0,
  } = {}) {
    var args = ['--radiolist', title];
    args.push(height, width, menuHeight);
    for(var k in choices)
      args.push(k, choices[k].value || choices[k], !!choices[k].active | 0);

    try {
      return await this._run(args);
    } catch(err) {
      return null;
    }
  }

  async  yesno(title, {
    width = 0, height = 0,
  } = {}) {
    var args = ['--yesno', title];
    args.push(height, width);

    try {
      return await this._run(args);
    } catch(err) {
      return null;
    }
  }



  async  checklist(title, choices, {
    width = 0, height = 0, menuHeight = 0,
  } = {}) {
    var args = ['--checklist', title];
    args.push(height, width, menuHeight);
    for(var k in choices)
      args.push(k, choices[k].value || choices[k], !!choices[k].active | 0);

    try {
      var response = await this._run(args);
      return splitArgs(response);
    } catch(err) {
      return null;
    }
  }

  _run(cmd) {
    var next = defer();
    var args = [].concat(this.options).concat(cmd);

    var child = cp.spawn(this._program, args, {
      stdio : ['inherit', 'inherit', 'pipe'],
    });

    child.on('error', next.reject);
    child.on('exit', async function(code) {

      if(code !== 0)
        return next.reject(`Bad exit code ${code}`);
      var body = await drain(child.stderr);
      next.resolve('' + body);
    });

    return next;

  }


}


module.exports = whiptail;
