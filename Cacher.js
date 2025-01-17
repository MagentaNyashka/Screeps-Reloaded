const { Node, Sequence, Selector, SUCCESS, FAILURE } = require('./BehaviorTree');
const constants = require('./constants');
const utf15 = require('./utf15');
const map_codec = new utf15.Codec({ depth: 6, array: 1 });

class memoryCheck extends Node {
    run(roomName) {
        console.log('Starting memoryCheck');
        if (!Memory.roomProperties) {
            return FAILURE;
        }
        if (!Memory.roomProperties[roomName]) {
            return FAILURE;
        }
        if (!Memory.roomProperties[roomName].roomPlan) {
            return FAILURE;
        }
        if (Game.time % 500 === 0) {
            return FAILURE;
        }
        return SUCCESS;
    }
}

class memorySet extends Node {
    run(roomName) {
        console.log('Starting memorySet');
        Memory.roomProperties = {};
        Memory.roomProperties[roomName] = {};
        Memory.roomProperties[roomName].roomPlan = {};
        return FAILURE;
    }
}

class roomPlanCacher extends Node {
    run(roomName) {
        console.log('Starting roomPlanCacher');
        
        const structures = Game.rooms[roomName].find(FIND_STRUCTURES, {
            filter: (structure) => structure.isActive(),
        });
        const grouped = _.groupBy(structures, (s) => s.structureType);

        _.forEach(Object.keys(constants.CONTROLLER_STRUCTURES), function (structureType) {
            let positions = [];
            _.forEach(grouped[structureType], function (structure) {
                const valuesX = structure.pos.x;
                const valuesY = structure.pos.y;
                positions.push(valuesX);
                positions.push(valuesY);
            });

            if (!Memory.roomProperties[roomName].roomPlan[structureType]) {
                Memory.roomProperties[roomName].roomPlan[structureType] = {};
            }
            Memory.roomProperties[roomName].roomPlan[structureType] = map_codec.encode(positions);
        });
    }
}

const runCacher = new Sequence([
    new Selector([
        new memoryCheck(),
        new memorySet(),
        new roomPlanCacher(),
    ]),
]);

module.exports = { runCacher };
