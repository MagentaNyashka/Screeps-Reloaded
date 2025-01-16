const BehaviorTree = require('./BehaviorTree');



module.exports = {
    run(creep) {
        BehaviorTree.harvesterBehavior.run(creep);
    }
};