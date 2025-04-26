const { Node, Sequence, Selector, SUCCESS, FAILURE } = require('./BehaviorTree');
const constants = require('./constants');




class AdvancedArchitectror {
    constructor(roomName, BLOCK){
        console.log('Starting AdvancedArchitectror');
        this.roomName = roomName;
        this.room = Game.rooms[roomName];
        this.BLOCK = BLOCK;
        this.origin = Memory.roomProperties[this.roomName].corePoint;
    }
    run(){
        const room = Game.rooms[this.roomName];
        if(!room){
            return FAILURE;
        }





        if(checkConstructionSites() < this.BLOCK.length * 4){return FAILURE;}
        this.terrain = new Room.Terrain(this.roomName);
        this.findPlaceForBlock();
		const status = this.placeStructuresInBlock();
        this.surroundWithRoad();
        // return status;

    }

    findPlaceForBlock() {
        console.log('Architector -> Finding place for block');
        let r = 0;
        let Available = false;
        let pivot = { x: -1, y: -1 };
        const center = this.origin;
        let count = 0;
    
        while (!Available) {
            const pos1 = { x: center.x - r, y: center.y - r };
            const pos2 = { x: center.x + r, y: center.y + r };
            console.log(`Checking positions from (${pos1.x}, ${pos1.y}) to (${pos2.x}, ${pos2.y})`);
    
            for (let x = pos1.x; x <= pos2.x; x++) {
                for (let y = pos1.y; y <= pos2.y; y++) {
                    const distanceFromOrigin = Math.sqrt(Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2));
                    if (distanceFromOrigin <= 3) {
                        console.log(`Skipping position (${x}, ${y}) due to proximity to origin`);
                        continue;
                    }
    
                    console.log(`Checking position (${x}, ${y})`);
                    if (this.canPlaceBlock({ x: x, y: y })) {
                        Available = true;
                        pivot.x = x;
                        pivot.y = y;
                        console.log(`Found available position at (${x}, ${y})`);
                        break;
                    }
                }
                if (Available) break;
            }
            r++;
            count++;
        }
        this.pivot = pivot;
    }

    canPlaceBlock(Pivot){
        console.log('Architector -> Checking if block can be placed');
        for(const pos of this.BLOCK){
            const x = Pivot.x + pos.x;
            const y = Pivot.y + pos.y;
            if(!this.canPlaceAt(x, y)){
                return false;
            }
        }
        return true;
    }

    canPlaceAt(x, y) {
        console.log('Architector -> Checking if block can be placed at specific position');
        const distanceFromOrigin = Math.sqrt(Math.pow(x - this.origin.x, 2) + Math.pow(y - this.origin.y, 2));
        return (
            this.terrain.get(x, y) !== TERRAIN_MASK_WALL &&
            this.room.lookForAt(LOOK_STRUCTURES, x, y).length === 0 &&
            this.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length === 0 &&
            distanceFromOrigin > 3
        );
    }

    placeStructuresInBlock() {
        console.log('Architector -> Placing structures in block');
        const BLOCK = this.BLOCK;
        for (const struct of BLOCK) {
            const x = this.pivot.x + struct.x;
            const y = this.pivot.y + struct.y;
            const structureType = struct.structure;
            const name = (structureType === STRUCTURE_SPAWN) ? 'S' + Game.time : '';
            console.log(`Placing ${structureType} at (${x}, ${y})`);

            const status = Game.rooms[this.roomName].createConstructionSite(x, y, structureType, name);
            console.log(`Status: ${status}`);
        }
        return SUCCESS;
    }

    surroundWithRoad() {
        console.log('Architector -> Surrounding block with road');
        const BLOCK = this.BLOCK;
    
        for (const struct of BLOCK) {
            const structX = this.pivot.x + struct.x;
            const structY = this.pivot.y + struct.y;
    
            for (let x = structX - 1; x <= structX + 1; x++) {
                for (let y = structY - 1; y <= structY + 1; y++) {
                    if ((x === structX && y === structY) || (x !== structX && y !== structY)) {
                        continue;
                    }
                    if (this.canPlaceAt(x, y)) {
                        console.log(`Placing road at (${x}, ${y})`);
                        Game.rooms[this.roomName].createConstructionSite(x, y, STRUCTURE_ROAD);
                    }
                }
            }
        }
    }

}




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


const CORE = [
    {x: 0, y:0, structure: STRUCTURE_ROAD},
    {x: -2, y: 0, structure: STRUCTURE_TOWER},
    {x: -1, y: -1, structure: STRUCTURE_NUKER},
    {x: -1, y: 0, structure: STRUCTURE_STORAGE},
    {x: -1, y: 1, structure: STRUCTURE_POWER_SPAWN},
    {x: 0, y:-2, structure: STRUCTURE_TOWER},
    {x: 0, y:-1, structure: STRUCTURE_TOWER},
    {x: 0, y:1, structure: STRUCTURE_TOWER},
    {x: 0, y:2, structure: STRUCTURE_TOWER},
    {x: 1, y:-1, structure: STRUCTURE_SPAWN},
    {x: 1, y:0, structure: STRUCTURE_TERMINAL},
    {x: 1, y:1, structure: STRUCTURE_LINK},
    {x: 2, y:0, structure: STRUCTURE_TOWER}
]


function checkConstructionSites(){
    console.log('Architector -> Checking construction sites');
    const CScount = Object.keys(Game.constructionSites).length;
    const freeCS = MAX_CONSTRUCTION_SITES - CScount;
    return freeCS;
}


function missingCount(roomName, structureType){
	const builtStructures = Game.rooms[roomName].find(FIND_MY_STRUCTURES) || [];
	const constructionSites = Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES) || [];
	const totalStructures = builtStructures.concat(constructionSites) || [];
	const totalCount = totalStructures.filter(s => s.structureType === structureType);
	return totalCount;
}

class spawnCheck extends Node{
    run(roomName){
        console.log('Starting spawnCheck');
        const room = Game.rooms[roomName];
        if(!room){
            return FAILURE;
        }
        const structureType = STRUCTURE_SPAWN;
		const RCL = Game.rooms[roomName].controller.level;
		const spawnCount = missingCount(roomName, structureType);
        if(CONTROLLER_STRUCTURES[structureType][RCL] > spawnCount){
            return FAILURE;
        }
        return SUCCESS;
    }
}

class placeSpawn extends Node {
    run(roomName) {
        console.log('Architector -> Starting placeSpawn');

        const findPlaceForMainCenter = function (roomName) {
            function findCenter(roomName) {
                const room = Game.rooms[roomName];
                if (!room) {
                    console.log(`Room ${roomName} not found`);
                    return null;
                }

                const positions = [];

                const sources = room.find(FIND_SOURCES);
                if (!sources) {
                    // console.log(`Sources not found in room ${roomName}`);
                } else {
                    sources.forEach(source => positions.push(source.pos));
                }

                if (room.controller) {
                    positions.push(room.controller.pos);
                } else {
                    // console.log(`Controller not found in room ${roomName}`);
                }

                const mineral = room.find(FIND_MINERALS)[0];
                if (mineral) {
                    positions.push(mineral.pos);
                } else {
                    // console.log(`Mineral not found in room ${roomName}`);
                }

                if (positions.length === 0) {
                    // console.log(`No positions found in room ${roomName}`);
                    return null;
                }

                const centerX = Math.round(_.sum(positions.map(pos => pos.x)) / positions.length);
                const centerY = Math.round(_.sum(positions.map(pos => pos.y)) / positions.length);

                return new RoomPosition(centerX, centerY, roomName);
            }

            let center = findCenter(roomName);
            if (!center) {
                console.log(`Center not found for room ${roomName}`);
                return null;
            }

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

            // function countFreeBlocks(center, terrain) {
            //     let freeBlocks = 25;

            //     for (let x = center.x - 2; x <= center.x + 2; x++) {
            //         for (let y = center.y - 2; y <= center.y + 2; y++) {
            //             if (terrain.get(x, y) === TERRAIN_MASK_WALL || terrain.get(x, y) === TERRAIN_MASK_LAVA || Game.rooms[center.roomName].lookForAt(LOOK_STRUCTURES, x, y).length > 0) {
            //                 freeBlocks--;
            //             }
            //         }
            //     }
            //     return freeBlocks;
            // }

            function countFreeBlocks(center, terrain){
                let freeBlocks = 0;
                for(const index in CORE){
                    const structure = CORE[index];
                    const X = center.x + structure.x;
                    const Y = center.y + structure.y;
                    const t = terrain.get(X, Y);
                    if(t === TERRAIN_MASK_WALL || t === TERRAIN_MASK_LAVA || Game.rooms[center.roomName].lookForAt(LOOK_STRUCTURES, X, Y).length > 0){
                        continue;
                    }
                    else{
                        freeBlocks++;
                    }
                }
                return freeBlocks;
            }

            let checkedCenters = [];
            checkedCenters.push(center);

            let freeBlocks = countFreeBlocks(center, terrain);
            do {

                if (freeBlocks < CORE.length) {
                    let blockStats = Array(4).fill(-1);
                    
                    _.forEach(DIRECTION, function (dirValue) {
                        let tempCenter = adjustCenter(center, dirValue);

                        if (checkedCenters.some(c => c.x === tempCenter.x && c.y === tempCenter.y)) {
                            return;
                        }

                        let tempFreeBlocks = countFreeBlocks(tempCenter, terrain);
                        blockStats[dirValue] = tempFreeBlocks;

                        checkedCenters.push(tempCenter);
                    });

                    let bestDirection = blockStats.indexOf(Math.max(...blockStats));
                    
                    if (bestDirection !== -1) {
                        center = adjustCenter(center, bestDirection);
                        freeBlocks = countFreeBlocks(center, terrain);
                    }
                }
                console.log(`${freeBlocks}/${CORE.length}`);
            } while (freeBlocks < CORE.length);

            new RoomVisual(roomName).circle(center.x, center.y, { fill: 'yellow', radius: 0.5 });
            // console.log(`Found suitable center: (${center.x}, ${center.y}) in room ${roomName}`);
            return center;
        };

        const corePoint = findPlaceForMainCenter(roomName);
        if(!corePoint || corePoint == null){
            return FAILURE;
        }
        const spawnCords = CORE.filter(s => s.structure === STRUCTURE_SPAWN)[0];
        const status = Game.rooms[roomName].createConstructionSite(corePoint.x+spawnCords.x, corePoint.y+spawnCords.y, spawnCords.structure, 'S_'+roomName+'0');
        Memory.roomProperties[roomName].corePoint = corePoint;
        return SUCCESS;

    }
}



//  NOTE:
//  Alt option: add checker for each block type so I can identify not-yet-built-block in a specific spot
//  Alt option: store not-yet-built-blocks in global. and readd them sometimes(if block is placed correctly avoid adding it to global.)
// [+]	Check spawn/Place spawn
// [-]	Check global./Place global.
// [-]	Check missing structures//Place missing structures

const runArchitector = new Sequence([
    new Selector([
        new spawnCheck(),               //check missing spawn
        new placeSpawn()                //place missing spawn based on algorithm and write Memory.roomProperties[roomName].corePoint
    ])
    // new Selector([
    //     new mainCheck(),                //check missing main block
    //     new placeMainBlock()            //place missing main block
    // ])
	// new Selector([
		// new structureCheck(),			//check missing structures
		// new placeStructures()			//place missing structures based on rcl(excluding special like scont and ccont)
	// ]),
	// new Selector([
		// new specialStructureCheck(),	//check spesial structures
		// new placeSpecialStructures()	//place special structures
	// ]),
	// new Selector([
		// new sourceContCheck(),
		
	// ])
]);

module.exports = { runArchitector };