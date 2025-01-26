const BehaviorTree = require('./BehaviorTree');
const Architector = require('./Architector').runArchitector;
const Cacher = require('./Cacher').runCacher;
const GlobalCacher = require('./GlobalCacher').runGlobalCacher;


const constants = require('./constants');


const roles = {
    harvester: require('role.harvester')
};

// const roomName = 'W2N5';
const roomName = 'sim';


module.exports.loop = function () {
    console.log('Running...');
    
    Cacher.run(roomName);
    GlobalCacher.run(roomName);
    Architector.run(roomName);


    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = roles[creep.memory.role];
        if (role) {
            role.run(creep);
        }
    }
};


