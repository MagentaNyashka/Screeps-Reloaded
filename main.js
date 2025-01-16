const Architector = require('./roomConstractor');
const BehaviorTree = require('./BehaviorTree');
const constants = require('./constants');


const roles = {
    harvester: require('role.harvester')
};

module.exports.loop = function () {
    if(!global){
        global = {};
    }

    console.log('Running...');
    BehaviorTree.cacherBehavior.run('W2N5');
    BehaviorTree.spawnBehavior.run('W2N25');

    // const customType = constants.CUSTOM_STRUCTURES.SLINK;
    // const realType = constants.CUSTOM_STRUCTURES_ASSIGN[customType];
    // console.log(`Custom: ${customType}, Real: ${realType}`);

    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = roles[creep.memory.role];
        if (role) {
            role.run(creep);
        }
    }
};


