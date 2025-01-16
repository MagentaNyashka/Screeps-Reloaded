const findPlaceForMainCenter = function (roomName) {
    if (Game.time % 5 != 0) {
        return;
    }


    function findCenter(roomName) {
        const room = Game.rooms[roomName];
        if (!room) {
            // console.log(`Room ${roomName} not visible.`);
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
    
    let center = findCenter(roomName); // Initial center
    const terrain = new Room.Terrain(roomName);
    const DIRECTION = { UP: 0, LEFT: 1, RIGHT: 2, DOWN: 3 }; // Enum for directions

    // Function to adjust the center position based on direction
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

    // Function to count free blocks in a 5x5 area around the center
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

    let checkedCenters = []; // List of already checked centers
    checkedCenters.push(center);

    let freeBlocks = countFreeBlocks(center); // Initial free block count

    do {
        if (freeBlocks < 25) {
            let blockStats = Array(4).fill(-1); // Initialize block stats for directions
            
            // Check free block count for each direction
            _.forEach(DIRECTION, function (dirValue) {
                let tempCenter = adjustCenter(center, dirValue);

                // Skip already-checked centers
                if (checkedCenters.some(c => c.x === tempCenter.x && c.y === tempCenter.y)) {
                    return;
                }

                // Count free blocks at the new position
                let tempFreeBlocks = countFreeBlocks(tempCenter);
                blockStats[dirValue] = tempFreeBlocks;

                // Store the new center to avoid revisiting
                checkedCenters.push(tempCenter);
            });

            // Find the direction with the highest free block count
            let bestDirection = blockStats.indexOf(Math.max(...blockStats));
            
            // If a valid direction is found, move the center
            if (bestDirection !== -1) {
                center = adjustCenter(center, bestDirection);
                freeBlocks = countFreeBlocks(center);
            }
        }
    } while (freeBlocks < 25);

    function placeSpawnCS(center){
        const controller = Game.rooms[roomName].controller;
        if(controller && controller.my){
            Game.rooms[roomName].createConstructionSite(center.x-1, center.y-1);
        }
    }
    // Mark the final center visually
    new RoomVisual(roomName).circle(center.x, center.y, { fill: 'yellow', radius: 0.5 });
    placeSpawnCS(center);
    console.log(`Found suitable center: (${center.x}, ${center.y}) in room ${roomName}`);
    return center;
};

const placeSourceContainers = function(roomName){

}




module.exports = {findPlaceForMainCenter};