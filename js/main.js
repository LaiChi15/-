var settings = {
  particles: {
    length: 500, // maximum amount of particles

    duration: 2, // particle duration in sec

    velocity: 100, // particle velocity in pixels/sec

    effect: -0.75, // play with this for a nice effect

    size: 30, // particle size in pixels
  },
};

/*
  
   * RequestAnimationFrame polyfill by Erik Möller
  
   */

(function () {
  var b = 0;
  var c = ["ms", "moz", "webkit", "o"];
  for (var a = 0; a < c.length && !window.requestAnimationFrame; ++a) {
    window.requestAnimationFrame = window[c[a] + "RequestAnimationFrame"];
    window.cancelAnimationFrame =
      window[c[a] + "CancelAnimationFrame"] ||
      window[c[a] + "CancelRequestAnimationFrame"];
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function (h, e) {
      var d = new Date().getTime();
      var f = Math.max(0, 16 - (d - b));
      var g = window.setTimeout(function () {
        h(d + f);
      }, f);
      b = d + f;
      return g;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function (d) {
      clearTimeout(d);
    };
  }
})();

/*
  
   * Point class
  
   */

var Point = (function () {
  function Point(x, y) {
    this.x = typeof x !== "undefined" ? x : 0;

    this.y = typeof y !== "undefined" ? y : 0;
  }

  Point.prototype.clone = function () {
    return new Point(this.x, this.y);
  };

  Point.prototype.length = function (length) {
    if (typeof length == "undefined")
      return Math.sqrt(this.x * this.x + this.y * this.y);

    this.normalize();

    this.x *= length;

    this.y *= length;

    return this;
  };

  Point.prototype.normalize = function () {
    var length = this.length();

    this.x /= length;

    this.y /= length;

    return this;
  };

  return Point;
})();

/*
  
   * Particle class
  
   */

var Particle = (function () {
  function Particle() {
    this.position = new Point();

    this.velocity = new Point();

    this.acceleration = new Point();

    this.age = 0;
  }

  Particle.prototype.initialize = function (x, y, dx, dy) {
    this.position.x = x;

    this.position.y = y;

    this.velocity.x = dx;

    this.velocity.y = dy;

    this.acceleration.x = dx * settings.particles.effect;

    this.acceleration.y = dy * settings.particles.effect;

    this.age = 0;
  };

  Particle.prototype.update = function (deltaTime) {
    this.position.x += this.velocity.x * deltaTime;

    this.position.y += this.velocity.y * deltaTime;

    this.velocity.x += this.acceleration.x * deltaTime;

    this.velocity.y += this.acceleration.y * deltaTime;

    this.age += deltaTime;
  };

  Particle.prototype.draw = function (context, image) {
    function ease(t) {
      return --t * t * t + 1;
    }

    var size = image.width * ease(this.age / settings.particles.duration);

    context.globalAlpha = 1 - this.age / settings.particles.duration;

    context.drawImage(
      image,
      this.position.x - size / 2,
      this.position.y - size / 2,
      size,
      size
    );
  };

  return Particle;
})();

/*
  
   * ParticlePool class
  
   */

var ParticlePool = (function () {
  var particles,
    firstActive = 0,
    firstFree = 0,
    duration = settings.particles.duration;

  function ParticlePool(length) {
    // create and populate particle pool

    particles = new Array(length);

    for (var i = 0; i < particles.length; i++) particles[i] = new Particle();
  }

  ParticlePool.prototype.add = function (x, y, dx, dy) {
    particles[firstFree].initialize(x, y, dx, dy);

    // handle circular queue

    firstFree++;

    if (firstFree == particles.length) firstFree = 0;

    if (firstActive == firstFree) firstActive++;

    if (firstActive == particles.length) firstActive = 0;
  };

  ParticlePool.prototype.update = function (deltaTime) {
    var i;

    // update active particles

    if (firstActive < firstFree) {
      for (i = firstActive; i < firstFree; i++) particles[i].update(deltaTime);
    }

    if (firstFree < firstActive) {
      for (i = firstActive; i < particles.length; i++)
        particles[i].update(deltaTime);

      for (i = 0; i < firstFree; i++) particles[i].update(deltaTime);
    }

    // remove inactive particles

    while (particles[firstActive].age >= duration && firstActive != firstFree) {
      firstActive++;

      if (firstActive == particles.length) firstActive = 0;
    }
  };

  ParticlePool.prototype.draw = function (context, image) {
    // draw active particles

    if (firstActive < firstFree) {
      for (i = firstActive; i < firstFree; i++)
        particles[i].draw(context, image);
    }

    if (firstFree < firstActive) {
      for (i = firstActive; i < particles.length; i++)
        particles[i].draw(context, image);

      for (i = 0; i < firstFree; i++) particles[i].draw(context, image);
    }
  };

  return ParticlePool;
})();

/*
  
   * Putting it all together
  
   */

(function (canvas) {
  var context = canvas.getContext("2d"),
    particles = new ParticlePool(settings.particles.length),
    particleRate = settings.particles.length / settings.particles.duration, // particles/sec
    time;

  // get point on heart with -PI <= t <= PI

  function pointOnHeart(t) {
    return new Point(
      160 * Math.pow(Math.sin(t), 3),

      130 * Math.cos(t) -
        50 * Math.cos(2 * t) -
        20 * Math.cos(3 * t) -
        10 * Math.cos(4 * t) +
        25
    );
  }

  // creating the particle image using a dummy canvas

  var image = (function () {
    var canvas = document.createElement("canvas"),
      context = canvas.getContext("2d");

    canvas.width = settings.particles.size;

    canvas.height = settings.particles.size;

    // helper function to create the path

    function to(t) {
      var point = pointOnHeart(t);

      point.x =
        settings.particles.size / 2 + (point.x * settings.particles.size) / 350;

      point.y =
        settings.particles.size / 2 - (point.y * settings.particles.size) / 350;

      return point;
    }

    // create the path

    context.beginPath();

    var t = -Math.PI;

    var point = to(t);

    context.moveTo(point.x, point.y);

    while (t < Math.PI) {
      t += 0.01; // baby steps!

      point = to(t);

      context.lineTo(point.x, point.y);
    }

    context.closePath();

    // create the fill

    context.fillStyle = "#ea80b0";

    context.fill();

    // create the image

    var image = new Image();

    image.src = canvas.toDataURL();

    return image;
  })();

  // render that thing!

  function render() {
    // next animation frame

    requestAnimationFrame(render);

    // update time

    var newTime = new Date().getTime() / 1000,
      deltaTime = newTime - (time || newTime);

    time = newTime;

    // clear canvas

    context.clearRect(0, 0, canvas.width, canvas.height);

    // create new particles

    var amount = particleRate * deltaTime;

    for (var i = 0; i < amount; i++) {
      var pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());

      var dir = pos.clone().length(settings.particles.velocity);

      particles.add(
        canvas.width / 2 + pos.x,
        canvas.height / 2 - pos.y,
        dir.x,
        -dir.y
      );
    }

    // update and draw particles

    particles.update(deltaTime);

    particles.draw(context, image);
  }

  // handle (re-)sizing of the canvas

  function onResize() {
    canvas.width = canvas.clientWidth;

    canvas.height = canvas.clientHeight;
  }

  window.onresize = onResize;

  // delay rendering bootstrap

  setTimeout(function () {
    onResize();

    render();
  }, 10);
})(document.getElementById("pinkboard"));



var audio = new Audio("/audio/main.mp3");

function play() {
  var audio = document.getElementById("audio");
  audio.play();
}

var requestAnimationFrame=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||window.msRequestAnimationFrame;var transforms=["transform","msTransform","webkitTransform","mozTransform","oTransform"];var transformProperty=getSupportedPropertyName(transforms);var snowflakes=[];var browserWidth;var browserHeight;var numberOfSnowflakes=50;var resetPosition=false;function setup(){window.addEventListener("DOMContentLoaded",generateSnowflakes,false);window.addEventListener("resize",setResetFlag,false)}setup();function getSupportedPropertyName(b){for(var a=0;a<b.length;a++){if(typeof document.body.style[b[a]]!="undefined"){return b[a]}}return null}function Snowflake(b,a,d,e,c){this.element=b;this.radius=a;this.speed=d;this.xPos=e;this.yPos=c;this.counter=0;this.sign=Math.random()<0.5?1:-1;this.element.style.opacity=0.5+Math.random();this.element.style.fontSize=4+Math.random()*30+"px"}Snowflake.prototype.update=function(){this.counter+=this.speed/5000;this.xPos+=this.sign*this.speed*Math.cos(this.counter)/40;this.yPos+=Math.sin(this.counter)/40+this.speed/30;setTranslate3DTransform(this.element,Math.round(this.xPos),Math.round(this.yPos));if(this.yPos>browserHeight){this.yPos=-50}};function setTranslate3DTransform(a,c,b){var d="translate3d("+c+"px, "+b+"px, 0)";a.style[transformProperty]=d}function generateSnowflakes(){var b=document.querySelector(".snowflake");var h=b.parentNode;browserWidth=document.documentElement.clientWidth;browserHeight=document.documentElement.clientHeight;for(var d=0;d<numberOfSnowflakes;d++){var j=b.cloneNode(true);h.appendChild(j);var e=getPosition(50,browserWidth);var a=getPosition(50,browserHeight);var c=5+Math.random()*40;var g=4+Math.random()*10;var f=new Snowflake(j,g,c,e,a);snowflakes.push(f)}h.removeChild(b);moveSnowflakes()}function moveSnowflakes(){for(var b=0;b<snowflakes.length;b++){var a=snowflakes[b];a.update()}if(resetPosition){browserWidth=document.documentElement.clientWidth;browserHeight=document.documentElement.clientHeight;for(var b=0;b<snowflakes.length;b++){var a=snowflakes[b];a.xPos=getPosition(50,browserWidth);a.yPos=getPosition(50,browserHeight)}resetPosition=false}requestAnimationFrame(moveSnowflakes)}function getPosition(b,a){return Math.round(-1*b+Math.random()*(a+2*b))}function setResetFlag(a){resetPosition=true};
