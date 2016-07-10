export default class QuadTree {
    constructor(level, bounds) {
        this.MAX_OBJECTS = 7;
        this.MAX_LEVELS = 10;

        this.bounds = bounds;
        this.level = level;
        this.nodes = [];
        this.objects = [];
    }

    clear() {
        let index;

        this.objects = [];

        for (index = 0; index < this.nodes.length; index++) {
            if (this.nodes[index]) {
                this.nodes[index].clear();
                this.nodes[index] = null;
            }
        }
    }

    split() {
        const nextLevel = this.level + 1;
        const subHeight = this.bounds.height / 2;
        const subWidth = this.bounds.width / 2;
        const x = this.bounds.x;
        const y = this.bounds.y;

        this.nodes[0] = new QuadTree(nextLevel, {
            x: x + subWidth,
            y: y,
            width: subWidth,
            height: subHeight
        });

        this.nodes[1] = new QuadTree(nextLevel, {
            x: x,
            y: y,
            width: subWidth,
            height: subHeight
        });

        this.nodes[2] = new QuadTree(nextLevel, {
            x: x,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        });

        this.nodes[3] = new QuadTree(nextLevel, {
            x: x + subWidth,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        });
    }

    getIndex(entity) {
        let aabb = entity.getAABB();
        let index = -1;
        let rect = {
            x1: aabb.min.x,
            y1: aabb.min.y,
            x2: aabb.max.x,
            y2: aabb.max.y,
        };
        const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
        const horizontalMidpoint = this.bounds.y - (this.bounds.height / 2);

        let topQuadrant = (rect.y1 > horizontalMidpoint);
        let bottomQuadrant = (rect.y2 < horizontalMidpoint);

        if (rect.x2 < verticalMidpoint) {
            if (topQuadrant) {
                index = 1;
            } else if (bottomQuadrant) {
                index = 2;
            }
        } else if (rect.x1 > verticalMidpoint) {
            if (topQuadrant) {
                index = 0;
            } else if (bottomQuadrant) {
                index = 3;
            }
        }

        return index;
    }

    insert(entity) {
        if (this.nodes[0]) {
            const index = this.getIndex(entity);

            if (index !== -1) {
                this.nodes[index].insert(entity);

                return;
            }
        }

        this.objects.push(entity);

        if (this.objects.length > this.MAX_OBJECTS && this.level < this.MAX_LEVELS) {
            if (!this.nodes[0]) {
                this.split();
            }

            let i = 0;

            while (i < this.objects.length) {
                let index = this.getIndex(this.objects[i]);

                if (index !== -1) {
                    const removed = this.objects.splice(i, 1);

                    this.nodes[index].insert(removed[0]);
                } else {
                    i++;
                }
            }
        }
    }

    _internalRetrieve(objects, entity) {
        let index = this.getIndex(entity);

        if (index !== -1 && this.nodes[0]) {
            this.nodes[index]._internalRetrieve(objects, entity);
        }

        objects.push.apply(objects, this.objects);
    }

    retrieve(entity) {
        let objects = [];

        this._internalRetrieve(objects, entity);

        return objects;
    }
}
