const BehaviorTree = require('./BehaviorTree');
const Architector = require('./Architector').runArchitector;
const Cacher = require('./Cacher').runCacher;
const GlobalCacher = require('./GlobalCacher').runGlobalCacher;


const constants = require('./constants');


const roles = {
    harvester: require('role.harvester')
};

module.exports.loop = function () {
    console.log('Running...');
    
    Cacher.run('W2N5');
    GlobalCacher.run('W2N25');
    Architector.run('W2N5');


    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = roles[creep.memory.role];
        if (role) {
            role.run(creep);
        }
    }
};


