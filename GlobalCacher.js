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
        return SUCCESS;
    }
}

class memorySet extends Node {
    run(roomName){
        console.log('Starting memorySet');
        if(!global.cache){
            global.cache = {};
        }
        if(!global.cache[roomName]){
            global.cache[roomName] = {};
        }
    }
}

global.getCachedStructures = function (roomName, structureType) {
    if (!Memory.roomProperties || !Memory.roomProperties[roomName] || !Memory.roomProperties[roomName].roomPlan) {
        return [];
    }
    if (!global.cache[roomName][structureType]) {
        const encodedData = Memory.roomProperties[roomName].roomPlan[structureType];
        if (!encodedData || encodedData === "0") {
            return [];
        }

        const coordinates = map_codec.decode(encodedData);

        let coordinatePairs = [];
        for (let i = 0; i < coordinates.length; i += 2) {
            if (coordinates[i + 1] !== undefined) {
                coordinatePairs.push({ x: coordinates[i], y: coordinates[i + 1] });
            }
        }

        let structures = [];
        for (let i = 0; i < coordinatePairs.length; i++) {
            const lookAtResult = Game.rooms[roomName].lookAt(coordinatePairs[i].x, coordinatePairs[i].y);

            const structure = lookAtResult.find(
                (s) => s.type === LOOK_STRUCTURES && s.structure.structureType === structureType
            );
            if (structure) {
                structures.push(structure.structure);
            }
        }
        global.cache[roomName][structureType] = structures;
    }

    return global.cache[roomName][structureType];
};

const runGlobalCacher = new Sequence([
    new Selector([
        new memoryCheck(),
        new memorySet()
    ]),
]);

module.exports = { runGlobalCacher };
