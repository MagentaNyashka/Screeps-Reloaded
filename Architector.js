const { Node, Sequence, Selector, SUCCESS, FAILURE } = require('./BehaviorTree');
const constants = require('./constants');

const MAIN_STRUCTURES = [
	STRUCTURE_SPAWN,
	STRUCTURE_EXTENSION,
	STRUCTURE_STORAGE,
	STRUCTURE_TOWER,
	STRUCTURE_OBSERVER,
	STRUCTURE_POWER_SPAWN,
	STRUCTURE_LAB,
	STRUCTURE_TERMINAL,
	STRUCTURE_NUKER,
	STRUCTURE_FACTORY
];

const MAIN_BLOCK = [
    { x: 0, y: 0, structure: STRUCTURE_ROAD },
    { x: -1, y: -1, structure: STRUCTURE_SPAWN },
    { x: -1, y: 1, structure: STRUCTURE_SPAWN },
    { x: 1, y: 1, structure: STRUCTURE_SPAWN },
    { x: -1, y: 0, structure: STRUCTURE_LINK },
    { x: 0, y: -1, structure: STRUCTURE_STORAGE },
    { x: 0, y: 1, structure: STRUCTURE_TERMINAL },
    { x: 1, y: 0, structure: STRUCTURE_NUKER },
    { x: 1, y: -1, structure: STRUCTURE_ROAD },
];

const EXT_BLOCK = [
    { x: 0, y: 0, structure: STRUCTURE_EXTENSION },
    { x: 1, y: 0, structure: STRUCTURE_EXTENSION },
    { x: 0, y: 1, structure: STRUCTURE_EXTENSION },
    { x: -1, y: 0, structure: STRUCTURE_EXTENSION },
    { x: 0, y: -1, structure: STRUCTURE_EXTENSION },
];

const TOWER_BLOCK = [
	{ x: 0, y: 0, structure: STRUCTURE_TOWER },
];

const LAB_BLOCK = [
	{ x: 0, y: 0, structure: STRUCTURE_LAB },
]

class spawnCheck extends Node{
    run(roomName){
        console.log('Starting spawnCheck');
        const room = Game.rooms[roomName];
        if(!room){
            return FAILURE;
        }
        const spawn = room.find(FIND_MY_SPAWNS);
        if(spawn.length == 0){
            return FAILURE;
        }
        return SUCCESS;
    }
}

class placeSpawn extends Node{
    run(roomName){
        console.log('Starting placeSpawn');

        const findPlaceForMainCenter = function (roomName) {
            function findCenter(roomName) {
                const room = Game.rooms[roomName];
                if (!room) {
                    return null;
                }
            
                const positions = [];
            
                const sources = room.find(FIND_SOURCES);
                sources.forEach(source => positions.push(source.pos));
            
                if (room.controller) {
                    positions.push(room.controller.pos);
                }
            
                const mineral = room.find(FIND_MINERALS)[0];
                if (mineral) {
                    positions.push(mineral.pos);
                }
            
                if (positions.length === 0) {
                    return null;
                }
            
                const centerX = Math.round(_.sum(positions.map(pos => pos.x)) / positions.length);
                const centerY = Math.round(_.sum(positions.map(pos => pos.y)) / positions.length);
            
                return new RoomPosition(centerX, centerY, roomName);
            }
            
            let center = findCenter(roomName);
            const terrain = new Room.Terrain(roomName);
            const DIRECTION = { UP: 0, LEFT: 1, RIGHT: 2, DOWN: 3 };
        
            function adjustCenter(center, direction) {
                const directions = [
                    { dx: 0, dy: -1 }, // Up
                    { dx: -1, dy: 0 }, // Left
                    { dx: 1, dy: 0 },  // Right
                    { dx: 0, dy: 1 },  // Down
                ];
                const dir = directions[direction];
                return { x: center.x + dir.dx, y: center.y + dir.dy, roomName: center.roomName };
            }
        
            function countFreeBlocks(center) {
                let freeBlocks = 25;
                for (let x = center.x - 2; x <= center.x + 2; x++) {
                    for (let y = center.y - 2; y <= center.y + 2; y++) {
                        if (terrain.get(x, y) === TERRAIN_MASK_WALL || terrain.get(x, y) === TERRAIN_MASK_LAVA) {
                            freeBlocks--;
                        }
                    }
                }
                return freeBlocks;
            }
        
            let checkedCenters = [];
            checkedCenters.push(center);
        
            let freeBlocks = countFreeBlocks(center);
        
            do {
                if (freeBlocks < 25) {
                    let blockStats = Array(4).fill(-1);
                    
                    _.forEach(DIRECTION, function (dirValue) {
                        let tempCenter = adjustCenter(center, dirValue);
        
                        if (checkedCenters.some(c => c.x === tempCenter.x && c.y === tempCenter.y)) {
                            return;
                        }
        
                        let tempFreeBlocks = countFreeBlocks(tempCenter);
                        blockStats[dirValue] = tempFreeBlocks;
        
                        checkedCenters.push(tempCenter);
                    });
        
                    let bestDirection = blockStats.indexOf(Math.max(...blockStats));
                    
                    if (bestDirection !== -1) {
                        center = adjustCenter(center, bestDirection);
                        freeBlocks = countFreeBlocks(center);
                    }
                }
            } while (freeBlocks < 25);
        
            new RoomVisual(roomName).circle(center.x, center.y, { fill: 'yellow', radius: 0.5 });
            // console.log(`Found suitable center: (${center.x}, ${center.y}) in room ${roomName}`);
            return center;
        };

        const corePoint = findPlaceForMainCenter(roomName);
        if(!corePoint || corePoint == null){
            return FAILURE;
        }
        const status = Game.rooms[roomName].createConstructionSite(corePoint.x-1, corePoint.y-1, STRUCTURE_SPAWN, 'S_'+roomName+'0');
        Memory.roomProperties[roomName].corePoint = corePoint;
        return SUCCESS;

    }
}

const MISSING_STRUCTURES = [];

class structureCheck extends Node{
	run(roomName){
		MISSING_STRUCTURES = [];
		const builtStructures = Game.rooms[roomName].find(FIND_MY_STRUCTURES);
		const RCL = Game.rooms[roomName].controller.level;
		for(const structureType in MAIN_STRUCTURES){
			const filter = builtStructures.filter(s => s.structureType === structureType);
			const delta = CONTROLLER_STRUCTURES[structureType][RCL] - filter.length;
			if(delta > 0){
				MISSING_STRUCTURES.push({structureType: structureType, count: delta});
			}
		}
		if(MISSING_STRUCTURES.length > 0){
			return FAILURE;
		}
		return SUCCESS;
	}
}

class placeStructures extends Node {
    run(roomName) {
        console.log('Starting placeStructures');
        
        const room = Game.rooms[roomName];
        if (!room) {
            return FAILURE;
        }

        const terrain = new Room.Terrain(roomName);
        const placedStructures = {};

        function canPlaceAt(x, y) {
            return (
                terrain.get(x, y) !== TERRAIN_MASK_WALL &&
                room.lookForAt(LOOK_STRUCTURES, x, y).length === 0 &&
                room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length === 0
            );
        }

		function canPlaceBlock(Pivot, block){
			for(const pos of block){
				const x = Pivot.x + pos.x;
				const y = Pivot.y + pos.y;
				if(!canPlaceAt(x, y)){
					return false;
				}
				return true;
			}
		}

		function findPlaceForBlock(block){
			let corePoint = Memory.roomProperties[roomName].corePoint;
			let delta = 2;
			let status = false;
			while(!status){
				for(let g = 1; g < 20; g++){
					delta = 2 * g;
					for(let i = 0; i < 4; i++){
						if(i % 2 == 0){
							corePoint.x += delta;
						}else{
							corePoint.y += delta;
						}
						status = canPlaceBlock(corePoint, block);
					}
					if(status){
						break;
					}
				}
			}
			return corePoint;
		}

        function placeStructureInBlock(block, structureType, pivot) {
            for (const pos of block) {
                const x = pivot.x + pos.x;
                const y = pivot.y + pos.y;

                if (canPlaceAt(x, y)) {
                    const status = room.createConstructionSite(x, y, structureType);
                    if (status === OK) {
                        return true;
                    }
                }
            }
            return false;
        }

        for (const missing of MISSING_STRUCTURES) {
            const { structureType, count } = missing;

            for (let i = 0; i < count; i++) {
                let blockToUse;
				switch(structureType){
					case STRUCTURE_SPAWN:
						blockToUse = MAIN_BLOCK;
						break;
					case STRUCTURE_EXTENSION:
						blockToUse = EXT_BLOCK;
						break;
					case STRUCTURE_STORAGE:
						blockToUse = MAIN_BLOCK;
						break;
					case STRUCTURE_TOWER:
						blockToUse = TOWER_BLOCK;
						break;
					case STRUCTURE_OBSERVER:
						blockToUse = MAIN_BLOCK;
						break;
					case STRUCTURE_POWER_SPAWN:
						blockToUse = MAIN_BLOCK;
						break;
					case STRUCTURE_LAB:
						blockToUse = LAB_BLOCK;
						break;
					case STRUCTURE_TERMINAL:
						blockToUse = MAIN_BLOCK;
						break;
					case STRUCTURE_NUKER:
						blockToUse = MAIN_BLOCK;
						break;
					case STRUCTURE_FACTORY:
						blockToUse = MAIN_BLOCK;
						break;
				}
				const Pivot = findPlaceForBlock(blockToUse);
                if (!placeStructureInBlock(blockToUse, structureType)) {
                    console.log(`No valid position found for ${structureType} in room ${roomName}`);
                    return FAILURE;
                }
            }
        }

        return SUCCESS;
    }
}





const runArchitector = new Sequence([
    new Selector([
        new spawnCheck(),               //check missing spawn
        new placeSpawn()                //place missing spawn based on algorithm and write Memory.roomProperties[roomName].corePoint
    ]),
	new Selector([
		new structureCheck(),			//check missing structures
		new placeStructures()			//place missing structures based on rcl(excluding special like scont and ccont)
	]),
	new Selector([
		new specialStructureCheck(),	//check spesial structures
		new placeSpecialStructures()	//place special structures
	])
]);

module.exports = { runArchitector };