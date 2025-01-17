const Architector = require('./roomConstractor');
const BehaviorTree = require('./BehaviorTree');
const constants = require('./constants');


const roles = {
    harvester: require('role.harvester')
};

const cacher = require('./Cacher').runCacher;
const architector = require('./Architector').runArchitector;

module.exports.loop = function () {
    if(!global){
        global = {};
    }

    console.log('Running...');
    
    cacher.run('W2N5');
    architector.run('W2N5');

    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = roles[creep.memory.role];
        if (role) {
            role.run(creep);
        }
    }
};


