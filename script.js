  (function () {
    function paintGrain(canvas) {
      var style = canvas.dataset.style || "grain";
      var base = canvas.dataset.base || "#845036";
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth || 200;
      var h = canvas.clientHeight || 240;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      var ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);

      function hexToRgb(hex) {
        var v = hex.replace("#", "");
        return [parseInt(v.substr(0,2),16), parseInt(v.substr(2,2),16), parseInt(v.substr(4,2),16)];
      }
      var rgb = hexToRgb(base);

      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      function shade(amount) {
        var r = Math.max(0, Math.min(255, rgb[0] + amount));
        var g = Math.max(0, Math.min(255, rgb[1] + amount));
        var b = Math.max(0, Math.min(255, rgb[2] + amount));
        return "rgb(" + r + "," + g + "," + b + ")";
      }

      if (style === "grain") {
        var lines = 26;
        for (var i = 0; i < lines; i++) {
          var y = (h / lines) * i + Math.random() * 3;
          var amp = 3 + Math.random() * 6;
          var freq = 0.02 + Math.random() * 0.03;
          var phase = Math.random() * 10;
          ctx.beginPath();
          ctx.strokeStyle = shade((Math.random() - 0.5) * 70);
          ctx.globalAlpha = 0.12 + Math.random() * 0.18;
          ctx.lineWidth = 0.6 + Math.random() * 1.4;
          for (var x = 0; x <= w; x += 4) {
            var yy = y + Math.sin(x * freq + phase) * amp;
            if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
      } else if (style === "stone") {
        ctx.globalAlpha = 1;
        for (var v = 0; v < 9; v++) {
          ctx.beginPath();
          ctx.strokeStyle = shade((Math.random() - 0.5) * 50);
          ctx.globalAlpha = 0.15 + Math.random() * 0.2;
          ctx.lineWidth = 0.8 + Math.random() * 1.6;
          var sx = Math.random() * w, sy = 0;
          ctx.moveTo(sx, sy);
          var cx1 = sx + (Math.random() - 0.5) * 60, cy1 = h * 0.33;
          var cx2 = sx + (Math.random() - 0.5) * 60, cy2 = h * 0.66;
          var ex = sx + (Math.random() - 0.5) * 80, ey = h;
          ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey);
          ctx.stroke();
        }
      } else if (style === "shimmer") {
        for (var s = 0; s < 30; s++) {
          ctx.beginPath();
          ctx.strokeStyle = shade((Math.random() - 0.3) * 90);
          ctx.globalAlpha = 0.08 + Math.random() * 0.14;
          ctx.lineWidth = 1;
          var x0 = Math.random() * w * 1.4 - w * 0.2;
          ctx.moveTo(x0, 0);
          ctx.lineTo(x0 - h * 0.6, h);
          ctx.stroke();
        }
      } else {
        ctx.globalAlpha = 0.06;
        for (var p = 0; p < 400; p++) {
          ctx.fillStyle = shade((Math.random() - 0.5) * 60);
          ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    var canvases = document.querySelectorAll("canvas.grain");
    canvases.forEach(paintGrain);

    function paintPageTexture() {
      var tile = 240;
      var canvas = document.createElement("canvas");
      canvas.width = tile;
      canvas.height = tile;
      var ctx = canvas.getContext("2d");

      var base = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() || "#faf7ee";
      var v = base.replace("#", "");
      if (v.length === 3) v = v.split("").map(function (c) { return c + c; }).join("");
      var rgb = [parseInt(v.substr(0, 2), 16), parseInt(v.substr(2, 2), 16), parseInt(v.substr(4, 2), 16)];

      function tint(amount, alpha) {
        var r = Math.max(0, Math.min(255, rgb[0] + amount));
        var g = Math.max(0, Math.min(255, rgb[1] + amount));
        var b = Math.max(0, Math.min(255, rgb[2] + amount));
        return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
      }

      ctx.fillStyle = base;
      ctx.fillRect(0, 0, tile, tile);

      // fine paper fibres: short random-angle dashes, tileable via wrapped placement
      for (var i = 0; i < 220; i++) {
        var x = Math.random() * tile;
        var y = Math.random() * tile;
        var len = 3 + Math.random() * 9;
        var angle = Math.random() * Math.PI;
        var dx = Math.cos(angle) * len;
        var dy = Math.sin(angle) * len;
        ctx.strokeStyle = tint((Math.random() - 0.5) * 60, 0.05 + Math.random() * 0.07);
        ctx.lineWidth = 0.6 + Math.random() * 0.7;
        [[0, 0], [tile, 0], [-tile, 0], [0, tile], [0, -tile]].forEach(function (off) {
          ctx.beginPath();
          ctx.moveTo(x + off[0], y + off[1]);
          ctx.lineTo(x + dx + off[0], y + dy + off[1]);
          ctx.stroke();
        });
      }

      // sparse flecks, like recycled-fibre paper
      for (var j = 0; j < 50; j++) {
        var fx = Math.random() * tile;
        var fy = Math.random() * tile;
        ctx.fillStyle = tint((Math.random() - 0.5) * 90, 0.04 + Math.random() * 0.05);
        ctx.beginPath();
        ctx.arc(fx, fy, 0.5 + Math.random() * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      document.body.style.backgroundImage = "url(" + canvas.toDataURL() + ")";
      document.body.style.backgroundSize = tile + "px " + tile + "px";
    }

    paintPageTexture();
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paintPageTexture);
    }
    new MutationObserver(paintPageTexture).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    var reveals = document.querySelectorAll(".benefit-card, .proof-logo, .collection-card");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.animation = "rise 0.7s cubic-bezier(.16,1,.3,1) forwards";
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      reveals.forEach(function (el) {
        el.style.opacity = "0";
        el.style.transform = "translateY(14px)";
        io.observe(el);
      });
    }
  })();
