const constants = require('./constants');
const utf15 = require('./utf15');
const map_codec = new utf15.Codec({ depth: 6, array: 1 });


const SUCCESS = 0;
const FAILURE = -1;
const RUNNING = 1;


class Node {
    run(creep) {
        throw new Error("run() must be implemented in subclasses");
    }
}

class Sequence extends Node {
    constructor(children) {
        super();
        this.children = children;
    }

    run(creep) {
        for (const child of this.children) {
            const result = child.run(creep);
            if (result !== SUCCESS) {
                return result;
            }
        }
        return SUCCESS;
    }
}

class Selector extends Node {
    constructor(children) {
        super();
        this.children = children;
    }

    run(creep) {
        for (const child of this.children) {
            const result = child.run(creep);
            if (result === SUCCESS) {
                return SUCCESS;
            }
            if (result === RUNNING) {
                return RUNNING;
            }
        }
        return FAILURE;
    }
}

















class memoryCheck extends Node{
    run(roomName){
        console.log('Starting memoryCheck');
        if(!Memory.roomProperties){
            return FAILURE;
        }
        if (!Memory.roomProperties[roomName]) {
            return FAILURE;
        }
        if (!Memory.roomProperties[roomName].roomPlan) {
            return FAILURE;
        }
        if (Game.time % 500 === 0) {return FAILURE;}
        return SUCCESS;
    }
}

class memorySetter extends Node{
    run(roomName){
        console.log('Starting memorySetter');
        Memory.roomProperties = {};
        Memory.roomProperties[roomName] = {};
        Memory.roomProperties[roomName].roomPlan = {};
        return SUCCESS;
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


const cacherBehavior = new Sequence([
    new Selector([
        new memoryCheck(),
        new memorySetter(),
        new roomPlanCacher()
    ])
])
























class CheckEnergy extends Node {
    run(creep) {
        console.log('Starting CheckEnergy');
        return creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 ? SUCCESS : FAILURE;
    }
}

class FindSource extends Node {
    run(creep) {
        console.log('Starting FindSource');
        if (!creep.memory.target) {
            const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            if (source) {
                creep.memory.target = source.id;
                return SUCCESS;
            }
            return FAILURE;
        }
        return SUCCESS;
    }
}


class HarvestSource extends Node {
    run(creep) {
        console.log('Starting HarvestSource');
        const source = Game.getObjectById(creep.memory.target);
        if (!source) {
            creep.memory.target = null;
            return FAILURE;
        }
        const result = creep.harvest(source);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(source);
            return 'RUNNING';
        }
        return result === OK ? SUCCESS : FAILURE;
    }
}

class DeliverEnergy extends Node {
    run(creep) {
        console.log('Starting DeliverEnergy');
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: structure =>
                (structure.structureType === STRUCTURE_SPAWN ||
                 structure.structureType === STRUCTURE_EXTENSION ||
                 structure.structureType === STRUCTURE_STORAGE) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (!target) {
            return FAILURE;
        }

        const result = creep.transfer(target, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(target);
            return RUNNING;
        }
        return result === OK ? SUCCESS : FAILURE;
    }
}

class CheckSourceCont extends Node{
    run(creep){
        console.log('Starting CheckSourceCont');
    }
}










const harvesterBehavior = new Sequence([
    new Selector([
        new Sequence([
            new CheckEnergy(),
            new Sequence([
                new FindSource(),
                new HarvestSource()
            ])
        ]),
        new DeliverEnergy()
    ])
]);






class creepsCheck extends Node{
    run(){
        console.log('Starting creepsCheck');
        for(var name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
            }
        }
        return SUCCESS;
    }
}


function adjustCenterBP(roomName){
    if(!Memory.cache){
        return {
            maxCenters: 0,
            CenterBP: []
        };
    }
    if(!Memory.cache.sourcePath){
        return {
            maxCenters: 0,
            CenterBP: []
        };
    }
    if(!Memory.cache.sourcePath[roomName]){
        return {
            maxCenters: 0,
            CenterBP: []
        };
    }
    const room = Game.rooms[roomName];
    let maxCenters = 0;
    let isAvailable = false;
    let sourcePath = Memory.cache.sourcePath[roomName];
    let BP = [];
    if(global.getCachedStructures(roomName, STRUCTURE_CONTAINER).length > 0 || global.getCachedStructures(roomName, STRUCTURE_LINK).length > 0){
        maxCenters = 1;
        let pathLength = sourcePath.length;
        if(sourcePath.length != 0){
            const sources = global.getSources(roomName);
            if(sources.length > 2){
                pathLength *= 2;
            }
            while(!isAvailable){
                const CARRY_count = Math.ceil(pathLength / 2.5 / maxCenters);
                let MOVE_count = Math.ceil(CARRY_count / 2);
                if(sourcePath.length !== sourcePath.cost){
                    MOVE_count = CARRY_count;
                }

                BP = [];
                for(let i = 0; i < MOVE_count; i++){
                    BP.push(MOVE);
                }
                for(let i = 0; i < CARRY_count; i++){
                    BP.push(CARRY);
                }
                // console.log(roomName,BP);
                let cost = BP.length * 50;
                if(cost > room.energyCapacityAvailable || BP.length > 50){
                    maxCenters++;
                }
                else{
                    isAvailable = true;
                }
            }
        }
        else{
            maxCenters = 1;
            BP = [MOVE, CARRY, CARRY];
        }
    }
    return {
        maxCenters: maxCenters,
        CenterBP: BP
    };
}

function adjustUpgraderBP(roomName){
    let maxUpgraders = 1;
    let isAvailable = false;
    let BP = [CARRY,MOVE];
    const sources = global.getSources(roomName);
    let energyPerTick = 7.5;
    // let work_Count;
    if(sources.length == 2){
        energyPerTick = 15;
    }
    while(!isAvailable){
        BP = [CARRY,MOVE];
        for(let i = 0; i < Math.ceil(energyPerTick)/maxUpgraders; i++){
            BP.push(WORK);
            // work_Count++;
        }
        // for(let i = 0; i < energyPerTick; i++){
        //     BP.push(MOVE);
        // }
        // console.log(work_Count);
        // for(let j = 0; j < work_Count; j++){
        //     BP.push(MOVE);
        // }
        // console.log(roomName,BP);
        let cost = 0;
        _.forEach(BP, function(part){
            switch(part){
                case MOVE:
                    cost += 50;
                    break;
                case CARRY:
                    cost += 50;
                    break;
                case WORK:
                    cost += 100;
                    break;
        }});
        if(BP.length > 50 || cost > Game.rooms[roomName].energyCapacityAvailable){
            maxUpgraders++;
        }
        else{
            isAvailable = true;
        }
    }
    return {
        maxUpgraders: maxUpgraders,
        UpgraderBP: BP
    };
}

function adjustMinerBP(roomName){
    let maxMiners = 0;
    let BP = [MOVE];
    const mineral = global.getMinerals(roomName)
    if(mineral[0].mineralAmount > 0 && global.getMineralContainers(roomName)[0].store.getFreeCapacity() > 100){
        maxMiners = 1;
        let maxBP = 20;
        let isAvailable = false;
        const minerals = global.getCachedStructures(roomName, STRUCTURE_EXTRACTOR);
        while(!isAvailable){
            BP = [MOVE];
            for(let i = 0; i < maxBP; i++){
                BP.push(WORK);
                if(i % 2 == 0){
                    BP.push(MOVE);
                }
            }
            let cost = 0;
            _.forEach(BP, function(part){
                switch(part){
                    case MOVE:
                        cost += 50;
                        break;
                    case WORK:
                        cost += 100;
                        break;
            }});
            if(BP.length > 50 || cost > Game.rooms[roomName].energyCapacityAvailable){
                maxBP--;
            }
            else{
                isAvailable = true;
            }
        }
    }
    return {
        maxMiners: maxMiners,
        MinerBP: BP
    };
}

function adjustTransferBP(roomName){
    if(!Memory.cache){
        return {
            maxTransferers: 0,
            TrasnfererBP: []
        };
    }
    if(!Memory.cache.mineralPath){
        return {
            maxTransferers: 0,
            TrasnfererBP: []
        };
    }
    if(!Memory.cache.mineralPath[roomName]){
        return {
            maxTransferers: 0,
            TrasnfererBP: []
        };
    }
    const room = Game.rooms[roomName];
    let maxTransferers = 1;
    let isAvailable = false;
    let mineralPath = Memory.cache.mineralPath[roomName];
    let BP = [];
    let pathLength = mineralPath.length;
    if(mineralPath.length != 0 || global.getCachedStructures(roomName, STRUCTURE_POWER_SPAWN).length > 0 || global.getCachedStructures(roomName, STRUCTURE_NUKER)){
        const sources = global.getSources(roomName);
        if(sources.length > 2){
            pathLength *= 2;
        }
        while(!isAvailable){
            const CARRY_count = Math.ceil(pathLength / 2.5 / maxTransferers);
            const MOVE_count = Math.ceil(CARRY_count / 2);
            
            BP = [];
            for(let i = 0; i < MOVE_count; i++){
                BP.push(MOVE);
            }
            for(let i = 0; i < CARRY_count; i++){
                BP.push(CARRY);
            }
            let cost = BP.length * 50;
            if(cost > room.energyCapacityAvailable || BP.length > 50){
                maxTransferers++;
            }
            else{
                isAvailable = true;
            }
        }
    }
    else{
        maxTransferers = 0;
        BP = [MOVE, CARRY, CARRY];
    }
    return {
        maxTransferers: maxTransferers,
        TrasnfererBP: BP
    };
}

function adjustHarvesterBP(roomName, sourceIndex=0){
    if(!Memory.cache){
        return {
            maxHarvesters: 2,
            HarvesterBP: [WOKR,CARRY,CARRY,MOVE]
        };
    }
    const room = Game.rooms[roomName];
    let maxHarvesters = 1;
    let freeBlocks = global.getFreeSources(roomName, global.getSources(roomName)[sourceIndex].id).length;
    let isAvailable = false;
    let BP = [];
    while(!isAvailable){
        const WORK_count = 6/maxHarvesters;
        const CARRY_count = 1;
        const MOVE_count = 2;
        let cost = 0;
        BP = [];
        for(let i = 0; i < MOVE_count; i++){
            BP.push(MOVE);
            cost += 50;
        }
        for(let i = 0; i < CARRY_count; i++){
            BP.push(CARRY);
            cost += 50;
        }
        for(let i = 0; i < WORK_count; i++){
            BP.push(WORK);
            cost += 100;
        }
        if(cost > room.energyCapacityAvailable || BP.length > 50){
            maxHarvesters++;
        }
        else{
            isAvailable = true;
        }
    }
    return {
        maxHarvesters: Math.min(maxHarvesters, freeBlocks),
        HarvesterBP: BP
    };
}

class cacheCreeps extends Node{
    run(roomName){
        console.log(`Starting cacheCreeps for ${roomName}`);

    }
}

class countCreeps extends Node {
    run(roomName) {
        console.log(`Starting countCreeps for ${roomName}`);


        if (!global.creeps) {
            global.creeps = {};
        }
        const creeps = _.filter(Game.creeps, (creep) => creep.room.name === roomName).length;

        global.creeps[roomName] = creeps;

        if (!global.creepsCount) {
            global.creepsCount = {};
        }

        global.creepsCount[roomName] = creeps;

        console.log(`Creep count for ${roomName}: ${global.creepsCount[roomName]}`);
    }
}



const spawnBehavior = new Sequence([
    new creepsCheck(),
    new countCreeps()
])



module.exports = { Node, Sequence, Selector, SUCCESS, FAILURE, RUNNING,
    harvesterBehavior,
    cacherBehavior,
    spawnBehavior
};