import React from 'react';
import PropTypes from 'prop-types';
import Matter from 'matter-js';
import Color from 'color';
import {maxwellPDF} from './utils';
import {gases} from './gases';

// Speed constant used to convert between matter.js speed and meters
// per second (m/s)
const PARTICLE_SPEED = 0.01;
var hydrogenFusionRate = 0.05;
var helium3FusionRate = 0.15;
var helium4FusionRate =0.25;
var counter=0;


var defaultCategory = 0x0001, // for walls
    hydrogenCategory = 0x002, // cat for H 
    deuteriumCategory = 0x003, // cat for D
    helium3Category = 0x0004,// cat for He3 
    helium4Category = 0x0005 // cat for He4 


const isParticleAboveEscapeSpeed = function(particle, escapeSpeed) {
    // Convert matter.js speed back to the meters per second (m/s)
    // unit we're using in the graph.
    let molecularSpeed = particle.speed / PARTICLE_SPEED;

    // If the particle's current speed is 0, that means it hasn't
    // started moving yet. In this case, just use the molecularSpeed
    // we've assigned it on creation.
    if (particle.speed === 0) {
        molecularSpeed = particle.molecularSpeed;
    }

    return molecularSpeed >= escapeSpeed;
};


/**
 * Scan the given particles and let the appropriate ones escape.
 */
const letParticlesEscape = function(particles, escapeSpeed) {
    particles.forEach(function(gasParticles) {
        gasParticles.forEach(function(p) {
            if (isParticleAboveEscapeSpeed(p, escapeSpeed)) {
                p.collisionFilter.category = 0;
            } else {
                p.collisionFilter.category = 1;
            }
        });
    });
};





/**
 * Adjust the velocity of a particle based on the initial speed we
 * assigned it, to make sure it doesn't lose energy.
 *
 * Based on:
 *   https://jsfiddle.net/xaLtoc2g/
 */
const adjustE = function(p) {
    const baseSpeed = p.molecularSpeed * PARTICLE_SPEED;

    if (p.speed !== 0) {
        let speedMultiplier = baseSpeed / p.speed;

        Matter.Body.setVelocity(
            p, {
                x: p.velocity.x * speedMultiplier,
                y: p.velocity.y * speedMultiplier
            }
        );
    }
};

const updateParticleSpeed = function(p, molecularSpeed) {
    p.molecularSpeed = molecularSpeed;

    const baseSpeed = p.molecularSpeed * PARTICLE_SPEED;
    let speedMultiplier = baseSpeed / p.speed;

    Matter.Body.setVelocity(p, {
        x: p.velocity.x * speedMultiplier,
        y: p.velocity.y * speedMultiplier
    });
};




export default class Chamber extends React.Component {
    constructor(props) {
        super(props);

        
        this.width = 800;
        this.height = 600;
        this.margin = 2;
        this.rateChange = 1.1e-4;

        this.el = React.createRef();

        this.particles = null;
    }

    render() {
        return (
            <div id="ChamberPixiView" ref={this.el}/>
        );
    }

    isOutOfBounds(p) {
        var pos=p.position;
        if(pos.x < 0 || pos.x > this.width){
            Matter.Body.setPosition(p,{x: this.width, y: pos.y});
         }
         if(pos.y < 0 || pos.y > this.height){
             Matter.Body.setPosition(p,{x: pos.x, y: this.height});
         }     
       
    }

    removeEscapedParticles() {
        const me = this;

        // Record the current particle counts in this callback, to
        // make it easy to determine whether any have escaped, based
        // on the criteria below.
        const currentParticleCounts = [null, null, null];
        this.particles.forEach(function(gasParticles, idx) {
            currentParticleCounts[idx] = gasParticles.length;
        });

        this.particles.forEach(function(gasParticles) {
            gasParticles.forEach(function(p, idx, array) {
                //console.log(p.position);
                me.isOutOfBounds(p);
               // console.log(p.position);

                      
            });
        });

        /*this.particles.forEach(function(gasParticles, idx) {
            // If no particles escaped, we don't need to call
            // onParticleCountUpdated.
            if (currentParticleCounts[idx].length !== gasParticles.length) {
                const proportion = gasParticles.length /
                      me.initialParticleCounts[idx];

                me.props.onParticleCountUpdated(idx, proportion * 100);
            }
        });*/
    }

    /**
     * Update particle speeds based on the new proportion, and the
     * original distribution bucket.
     */
    updateParticleSpeeds(particles, distributionBucket, proportion) {
        let pIdx = 0;
        distributionBucket.forEach(function(bucket) {
            const particlesAtThisSpeed = Math.round(
                bucket.particleCount * (proportion / 100)
            );

            // If there are some particles set to this speed bucket,
            // update the particles array.
            if (particlesAtThisSpeed > 0) {
                let i = 0;
                for (i; i < particlesAtThisSpeed; i++) {
                    const idx = pIdx + i;
                    if (idx > particles.length) {
                        continue;
                    }
                    const p = particles[pIdx + i];
                    if (p) {
                        updateParticleSpeed(p, bucket.speed);
                    }
                }
                pIdx += particlesAtThisSpeed;
            }
        });

        return particles;
    }

    /**
     * Adjust each particle's speed to keep the distributions even as
     * they escape.
     */
    refreshParticleSpeedDistribution() {
        const me = this;
        this.particles.forEach(function(gasParticles, idx) {
            const gasParticleCount = gasParticles.length;
            const initialCount = me.initialParticleCounts[idx];
            if (initialCount !== gasParticleCount) {
                me.updateParticleSpeeds(
                    gasParticles,
                    me.distributionBuckets[idx],
                    me.props.gasProportions[idx]);
            }
        });
    }

    
   

    makeParticle(gas, molecularSpeed) {
        const particleMargin = this.margin + 10;
        const particleColor = Color(gas.color);
        const gasGroup = Number(gas.gasGroup);
        counter++;
        console.log("nubmer"+counter);
        const x = Math.random() * (this.width - particleMargin) + (particleMargin / 2);

        const y = Math.random() * (this.height - particleMargin) + (particleMargin / 2);

        const p = Matter.Bodies.circle(
            x,
            y,
            gas.particleSize, {
                collisionFilter: {
                    mask:  0x0002, 
                    category: 0x0001,
                    group: gasGroup
                },
                render: {
                    fillStyle: particleColor.hex(),
                    lineWidth: 3
                },
                restitution: 1,
                friction: 0,
                frictionAir: 0
            });

            
          
        Matter.Body.setInertia(p, Infinity);
        p.molecularSpeed = molecularSpeed;

        /*if (this.props.allowEscape &&
            isParticleAboveEscapeSpeed(p, this.props.escapeSpeed)
           ) {
            p.collisionFilter.category = 0;
        } else {
            p.collisionFilter.category = 1;
        }*/

        const direction = Math.random() * Math.PI * 2;
        p.direction = direction;
        Matter.Body.setVelocity(p, {
            x: Math.sin(direction) * (PARTICLE_SPEED * molecularSpeed),
            y: Math.cos(direction) * (PARTICLE_SPEED * -molecularSpeed)
        });

        return p;
    }


   

    drawParticles(activeGases=[], gasProportions=[], distributionBuckets) {
        const me = this;
        const particles = [];

        activeGases.forEach(function(gas, idx) {
            const proportion = gasProportions[idx];
            const buckets = distributionBuckets[idx];

            const p = [];

            buckets.forEach(function(bucket) {
                // The number of particles to create for a given
                // bucket depends on the pre-calculated distribution
                // bucket as well as this gas's proportion state.
                const particleCount = bucket.particleCount * (
                    proportion / 100);

                for (let i = 0; i < particleCount; i++) {
                    p.push(
                        me.makeParticle(gas, bucket.speed));
                        
                }
            });

            particles[idx] = p;
        });

        return particles;
    }

    /**
     * Adjust each particle's speed to keep the distributions even as
     * they escape.
     */
    updateParticles(activeGases=[], gasProportions=[], distributionBuckets) {
        const me = this;
        const particles = [];

        activeGases.forEach(function(gas, idx) {
            const proportion = gasProportions[idx];
            const buckets = distributionBuckets[idx];

            const p = [];

            buckets.forEach(function(bucket) {
                // The number of particles to create for a given
                // bucket depends on the pre-calculated distribution
                // bucket as well as this gas's proportion state.
                const particleCount = bucket.particleCount * (
                    proportion / 100);

                for (let i = 0; i < particleCount; i++) {

                    p.push(
                        me.makeParticle(gas, bucket.speed));
                }
            });

            particles[idx] = p;
        });

        return particles;
    }

    /**
     * Generate Maxwell PDF distribution buckets for the given gas
     * type.
     *
     * Returns an array of the numbers of particles we want to create
     * at each speed interval.
     */
    generateBuckets(gas) {
        const distributionBuckets = [];

        for (let i = 0; i < 2100; i += 20) {
            let particleCount = maxwellPDF(
                i / (460 / 1.5),
                gas.mass,
                this.props.temperature);

            particleCount *= 10;
            particleCount = Math.round(particleCount);

            distributionBuckets.push({
                speed: i,
                particleCount: particleCount
            });
        }

        return distributionBuckets;
    }

    refreshScene() {
        const me = this;

        if (this.particles) {
            this.particles.forEach(function(gasParticles) {
                Matter.Composite.remove(me.engine.world, gasParticles);
            });
        }

        this.distributionBuckets = [];
        const initialParticleCounts = [];
        this.props.activeGases.forEach(function(gas) {
            const buckets = me.generateBuckets(gas);

            const totalParticles = buckets.reduce(
                function(prev, cur) {
                    return prev + cur.particleCount;
                }, 0);

            initialParticleCounts.push(totalParticles);
            me.distributionBuckets.push(buckets);
        });

        this.initialParticleCounts = initialParticleCounts;
        this.particles = this.drawParticles(
            this.props.activeGases,
            this.props.gasProportions,
            this.distributionBuckets);

        this.particles.forEach(function(gasParticles) {
            Matter.Composite.add(me.engine.world, gasParticles);
        });

    }

    drawWalls() {
        const Bodies = Matter.Bodies;
        const margin = this.margin;
        const wallOptions = {
            isStatic: true,
            render: {
                fillStyle: 'white',
                strokeStyle: 'white',
                lineWidth: 0
            },
            collisionFilter: {
                mask: 1,
                category: 0x0001,
                group: -1
            }
        };

        return [
            // Bottom wall
            Bodies.rectangle(
                // x, y
                0, this.height,
                // width, height
                this.width , margin,
                wallOptions
            ),
            // right wall
            Bodies.rectangle(
                // x, y
                this.width, 0,
                // width, height
                margin, this.height ,
                wallOptions
            ),
            // top wall
            Bodies.rectangle(
                // x, y
                0, 0,
                // width, height
                this.width , margin,
                wallOptions
            ),
            // left wall
            Bodies.rectangle(
                // x, y
                0, 0,
                // width, height
                margin, this.height ,
                wallOptions
            ),
        ];
    }

    

    componentDidMount() {
        const Engine = Matter.Engine,
              Render = Matter.Render,
              Runner = Matter.Runner,
              Composite = Matter.Composite;

        // create an engine
        const engine = Engine.create();
        this.engine = engine;
        engine.world.gravity.y = 0;

        // create a renderer
        const render = Render.create({
            element: this.el.current,
            engine: engine,
            width: this.width,
            height: this.height,
            options: {
                wireframes: false,
                background: 'white',
            }
        });

        const walls = this.drawWalls();
        Composite.add(engine.world, walls);

        Render.lookAt(render, {
            min: { x: 0, y: 0 },
            max: { x: this.width, y: this.height }
        });

        // run the renderer
        Render.run(render);

        const runner = Runner.create();
        this.runner = runner;
        Runner.run(runner, engine);
        if (!this.props.isPlaying) {
            Runner.stop(runner);
        }

        const me = this;
       
        Matter.Events.on(render, 'afterRender', function() {
            // Draw box where the walls are, since the physical walls are
            // invisible.
            const ctx = render.context;

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.rect(
                me.margin / 2,
                (me.margin - 50) / 2,
                me.width - (me.margin * 2),
                me.height - ((me.margin - 25) * 2)
            );
            ctx.stroke();
        });

        let counter0 = 0;
        Matter.Events.on(engine, 'beforeUpdate', function(e) {
            if (e.timestamp >= counter0 + 500) {
                me.particles.forEach(function(gasParticles) {
                    gasParticles.forEach(function(p) {
                        adjustE(p);

                    });
                });

                counter0 = e.timestamp;
            }
        });

        this.refreshScene();

        Matter.Events.on(me.engine, "collisionActive", (event) => {
            event.pairs.forEach(({ bodyA, bodyB }) => {
                // filter collision between particles 
                if(bodyA.collisionFilter.group > 0 && bodyB.collisionFilter.group > 0 ){

                    
                }
            });
        });

      
          Matter.Events.on(me.engine, "collisionEnd", (event) => {
            event.pairs.forEach(({ bodyA, bodyB }) => {
                // filter collision between particles 
                if(bodyA.collisionFilter.group > 0 && bodyB.collisionFilter.group > 0 ){
                    var bodiesType = (bodyA.collisionFilter.group,bodyB.collisionFilter.group);
                    switch (bodiesType) {
                        case (2,2):
                            if(Math.random() < hydrogenFusionRate){
                                console.log("H-H Reaction");
                                //speed= Matter.Body.getVelocity(bodyA);
                                console.log(bodyA,bodyB);
                            
                                const newP = me.makeParticle(gases[1], 400);
                                console.log(newP);
                                Matter.Composite.remove(me.engine.world, bodyA);

                                Matter.Composite.remove(me.engine.world, bodyB);
                                Matter.Composite.add(me.engine.world,newP);

                            }
                            break;
                        case (2,3):
                            if(Math.random() < helium3FusionRate*me.props.rate_change){
                                console.log("H-D Reaction");
                                //speed= Matter.Body.getVelocity(bodyA);
                                console.log(bodyA,bodyB);
                                
            
                                //Matter.Composite.remove(me.engine.world, bodyB);
                                Matter.Composite.add(me.engine.world,me.makeParticle(gases[2], 200));

                            }
                            break;
                        case (3,2):
                            if(Math.random() < helium3FusionRate*me.probs.rate_change){
                                console.log("H-D Reaction");
                                //speed= Matter.Body.getVelocity(bodyA);
                                console.log(bodyA,bodyB);
                                
            
                                //Matter.Composite.remove(me.engine.world, bodyB);
                                Matter.Composite.add(me.engine.world,me.makeParticle(gases[2], 200));

                            }
                            break;
                        case (4,4):
                            if(Math.random() < helium4FusionRate*me.props.rate_change){
                                console.log("He3-He3 Reaction");
                                //speed= Matter.Body.getVelocity(bodyA);
                                console.log(bodyA,bodyB);
                                
            
                                //Matter.Composite.remove(me.engine.world, bodyB);
                                Matter.Composite.add(me.engine.world,me.makeParticle(gases[3], 200));

                            }
                            break;
                        default:
                            console.log("no reaction");
                            
                    }
                }
            });
          });

        
        let counter1 = 0;
        Matter.Events.on(engine, 'afterUpdate', function(e) {
            if (e.timestamp >= counter1 + 200) {
                if (me.props.allowEscape) {
                    me.removeEscapedParticles();
                    letParticlesEscape(me.particles, me.props.escapeSpeed);
                }

                me.refreshParticleSpeedDistribution();
                counter1 = e.timestamp;
            }
        });

       

        
    }


    
       
    
      


    componentDidUpdate(prevProps) {
        if (
            prevProps.activeGases !== this.props.activeGases ||
                prevProps.temperature !== this.props.temperature
           ) {
            this.refreshScene();
            
        }

        if (
                prevProps.temperature !== this.props.temperature
           ) {
            if (prevProps.temperature < this.props.temperature){
                console.log(this.rateChange,this.props.temperature);
                this.rateChange= this.rateChange * this.props.temperature/1e2;
                console.log(this.rateChange);
            }else{
                console.log(this.rateChange,this.props.temperature);
                this.rateChange= this.rateChange / this.props.temperature/1e2;
                console.log(this.rateChange);
            }
        }

        if (
            !this.props.isPlaying &&
                prevProps.gasProportions !== this.props.gasProportions
        ) {
            this.refreshScene();
        }

        if (prevProps.isPlaying !== this.props.isPlaying) {
            this.refreshRunner(
                this.runner, this.engine, this.props.isPlaying);
        }

        const me = this;
        if (prevProps.allowEscape !== this.props.allowEscape) {
            // Update all the particles' category to make them ignore
            // the walls.
            this.particles.forEach(function(gasParticles) {
                gasParticles.forEach(function(p) {
                    if (!me.props.allowEscape) {
                        p.collisionFilter.category = 1;
                    } else if (
                        isParticleAboveEscapeSpeed(p, me.props.escapeSpeed)
                    ) {
                        p.collisionFilter.category = 0;
                    }
                });
            });
        }

        if (this.props.allowEscape &&
            prevProps.escapeSpeed !== this.props.escapeSpeed
           ) {
            letParticlesEscape(this.particles, this.props.escapeSpeed);
        }

    }

    refreshRunner(runner, engine, isPlaying) {
        if (isPlaying) {
            engine.timing.timeScale = 1;
            Matter.Runner.start(runner, engine);
        } else {
            engine.timing.timeScale = 0;
            Matter.Runner.stop(runner);
        }
    }
}

Chamber.propTypes = {
    activeGases: PropTypes.array.isRequired,
    gasProportions: PropTypes.array.isRequired,
    isPlaying: PropTypes.bool.isRequired,
    allowEscape: PropTypes.bool.isRequired,
    escapeSpeed: PropTypes.number.isRequired,
    temperature: PropTypes.number.isRequired,
    onParticleCountUpdated: PropTypes.func.isRequired
};
