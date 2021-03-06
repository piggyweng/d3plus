var copy       = require("../../../util/copy.coffee"),
    fetchText  = require("../../../core/fetch/text.js"),
    fetchValue = require("../../../core/fetch/value.coffee"),
    mix        = require("../../../color/mix.coffee"),
    print      = require("../../../core/console/print.coffee"),
    rtl        = require("../../../client/rtl.coffee"),
    shapeColor = require("./color.coffee"),
    stringList = require("../../../string/list.coffee"),
    textColor  = require("../../../color/text.coffee"),
    textWrap   = require("../../../textwrap/textwrap.coffee");

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "labels" using svg:text and d3plus.textwrap
//------------------------------------------------------------------------------
module.exports = function( vars , group ) {

  var scale = vars.types[vars.type.value].zoom ? vars.zoom.behavior.scaleExtent() : [1,1],
              selection = vars.g[ group ].selectAll("g");

  var opacity = function(elem) {

    elem
      .attr("opacity",function(d){
        if (vars.draw.timing) return 1;
        var size = parseFloat(d3.select(this).attr("font-size"),10);
        d.visible = size * (vars.zoom.scale/scale[1]) >= 2;
        return d.visible ? 1 : 0;
      });

  };

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Label Exiting
  //----------------------------------------------------------------------------
  remove = function(text) {

    if (vars.draw.timing) {
      text
        .transition().duration(vars.draw.timing)
        .attr("opacity",0)
        .remove();
    }
    else {
      text.remove();
    }

  };

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Label Styling
  //----------------------------------------------------------------------------
  style = function(text,wrap) {

    function x_pos(t) {

      if ( t.shape === "circle" ) {
        return "0px";
      }

      var align = t.anchor || vars.labels.align,
          tspan = this.tagName.toLowerCase() === "tspan",
          share = tspan ? this.parentNode.className.baseVal == "d3plus_share" : this.className.baseVal == "d3plus_share",
          width = d3.select(this).node().getComputedTextLength()/scale[1];

      var pos;
      if (align == "middle" || share) {
        pos = t.x-width/2;
      }
      else if ((align == "end" && !rtl) || (align == "start" && rtl)) {
        pos = t.x+(t.w-t.padding)/2-width;
      }
      else {
        pos = t.x-(t.w-t.padding)/2;
      }

      if (tspan) {
        var t_width = this.getComputedTextLength()/scale[1];
        if (align == "middle") {
          if (rtl) {
            pos -= (width-t_width)/2;
          }
          else {
            pos += (width-t_width)/2;
          }
        }
        else if (align == "end") {
          if (rtl) {
            pos -= (width-t_width);
          }
          else {
            pos += (width-t_width);
          }
        }
      }

      if (rtl) {
        pos += width;
      }

      return pos*scale[1];

    }

    function y_pos(t) {

      if (d3.select(this).select("tspan").empty()) {
        return 0;
      }
      else {

        var align = vars.labels.align,
            height = d3.select(this).node().getBBox().height/scale[1],
            diff = (parseFloat(d3.select(this).style("font-size"),10)/5)/scale[1],
            y;

        if (this.className.baseVal == "d3plus_share") {
          var data = d3.select(this.parentNode).datum();
          var pheight = data.d3plus.r ? data.d3plus.r*2 : data.d3plus.height;
          pheight = pheight/scale[1];
          if (align == "end") {
            y = t.y-pheight/2+diff/2;
          }
          else {
            y = t.y+pheight/2-height-diff/2;
          }
        }
        else {

          if (t.shape === "circle" || align === "middle" || t.valign === "center") {
            y = t.y-height/2-diff/2;
          }
          else if (align == "end") {
            y = t.y+(t.h-t.padding)/2-height+diff/2;
          }
          else {
            y = t.y-(t.h-t.padding)/2-diff;
          }

        }

        return y*scale[1];

      }
    }

    text
      .attr("font-weight",vars.labels.font.weight)
      .attr("font-family",vars.labels.font.family.value)
      .style("text-anchor",function(t){
        return t.shape === "circle" ? "middle" : "start";
      })
      .attr("pointer-events",function(t){
        return t.mouse ? "auto": "none";
      })
      .attr("fill", function(t){

        if ( t.color ) return t.color;

        var color = shapeColor(t.parent,vars),
            legible = textColor(color),
            opacity = t.text ? 0.15 : 1;

        return mix( color , legible , 0.2 , opacity );

      })
      .attr("x",x_pos)
      .attr("y",y_pos);

    if (wrap) {

      text
        .each(function(t){

          if (t.resize instanceof Array) {
            var min = t.resize[0], max = t.resize[1];
          }

          var size = t.resize, resize = true;

          if (t.text) {

            if ( !(size instanceof Array) ) {
              size = [9, 50];
              resize = t.resize;
            }

            textWrap()
              .container( d3.select(this) )
              .height( t.h*scale[0]-t.padding )
              .resize( resize )
              .size( size )
              .text( vars.format.value(t.text*100,"share")+"%" , vars)
              .width( t.w*scale[0]-t.padding )
              .draw();

          }
          else {

            var height;
            if (vars.labels.align !== "middle" && t.share) {
              height = t.h * scale[1] - t.padding/2 - t.share;
            }
            else {
              height = t.h * scale[1] - t.padding;
            }

            if ( !(t.resize instanceof Array) ) {
              size = [7, 40*(scale[1]/scale[0])];
              resize = t.resize;
            }

            var shape = t.shape || "square";

            textWrap()
              .container( d3.select(this) )
              .height( height )
              .resize( resize )
              .size( size )
              .shape( shape )
              .text( t.names )
              .width( t.w*scale[1] - t.padding )
              .draw();

          }

        })
        .attr("x",x_pos)
        .attr("y",y_pos);

    }

    text
      .attr("transform",function(t){
        var a = t.angle || 0,
            x = t.translate && t.translate.x ? t.translate.x : 0,
            y = t.translate && t.translate.y ? t.translate.y : 0;

        return "rotate("+a+","+x+","+y+")scale("+1/scale[1]+")";
      })
      .selectAll("tspan")
        .attr("x",x_pos);

  };

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Loop through each selection and analyze the labels
  //----------------------------------------------------------------------------
  if (group === "edges" || vars.labels.value) {

    if ( vars.dev.value ) {
      var timerString = "drawing " + group + " labels";
      print.time( timerString );
    }

    selection.each(function(d){

      var disabled = d.d3plus && "label" in d.d3plus && !d.d3plus.label,
          label = d.d3plus_label ? d.d3plus_label : vars.zoom.labels ? vars.zoom.labels[d.d3plus.id] : null,
          share = d.d3plus_share,
          names = d.d3plus.text ? d.d3plus.text :
                  label && label.names ? label.names :
                  vars.labels.text.value ?
                  fetchValue(vars, d, vars.labels.text.value) :
                  fetchText(vars,d),
          group = label && "group" in label ? label.group : d3.select(this),
          share_size = 0,
          fill = vars.types[vars.type.value].fill;

      if (!(names instanceof Array)) names = [names];

      if (label) {

        if (["line","area"].indexOf(vars.shape.value) >= 0) {
          var background = true;
        }
        else if (d && "d3plus" in d) {
          var active = vars.active.value ? fetchValue(vars, d, vars.active.value) : d.d3plus.active,
              temp   = vars.temp.value ? fetchValue(vars, d, vars.temp.value) : d.d3plus.temp,
              total  = vars.total.value ? fetchValue(vars, d, vars.total.value) : d.d3plus.total,
              background = (!temp && !active) || (active === total);
        }

      }

      if (!disabled && (background || !fill)) {

        if (share && d.d3plus.share && vars.labels.align != "middle") {

          share.resize = vars.labels.resize.value === false ? false :
            share && "resize" in share ? share.resize : true;

          share.padding = vars.labels.padding * 2;

          share.text = d.d3plus.share;
          share.parent = d;

          var text = group.selectAll("text#d3plus_share_"+d.d3plus.id)
            .data([share],function(t){
              return t.w+""+t.h+""+t.text;
            });

          if (vars.draw.timing) {

            text
              .transition().duration(vars.draw.timing/2)
              .call(style);

            text.enter().append("text")
              .attr("id","d3plus_share_"+d.d3plus.id)
              .attr("class","d3plus_share")
              .attr("opacity",0)
              .call(style,true)
              .transition().duration(vars.draw.timing/2)
              .delay(vars.draw.timing/2)
              .attr("opacity",1);

          }
          else {

            text
              .attr("opacity",1)
              .call(style);

            text.enter().append("text")
              .attr("id","d3plus_share_"+d.d3plus.id)
              .attr("class","d3plus_share")
              .attr("opacity",1)
              .call(style,true);

          }

          share_size = text.node().getBBox().height;

          text.exit().call(remove);

        }
        else {
          group.selectAll("text.d3plus_share")
            .call(remove);
        }

        if (label) {

          label.resize = vars.labels.resize.value === false ? false :
            label && "resize" in label ? label.resize : true;

          var padding = typeof label.padding === "number" ? label.padding : vars.labels.padding;
          label.padding = padding * 2;

        }

        if (label && label.w*scale[1]-label.padding >= 20 && label.h*scale[1]-label.padding >= 10 && names.length) {

          var and = vars.format.locale.value.ui.and,
              more = vars.format.locale.value.ui.more;

          for (var i = 0; i < names.length; i++) {
            if (names[i] instanceof Array) {
              names[i] = stringList(names[i],and,3,more);
            }
          }

          label.names = names;

          label.share = share_size;
          label.parent = d;

          var text = group.selectAll("text#d3plus_label_"+d.d3plus.id)
            .data([label],function(t){
              if (!t) return false;
              return t.w+"_"+t.h+"_"+t.x+"_"+t.y+"_"+t.names.join("_");
            }), fontSize = label.resize ? undefined :
                           (vars.labels.font.size * scale[0]) + "px";

          if ( vars.draw.timing ) {

            text
              .transition().duration(vars.draw.timing/2)
              .call(style)
              .call(opacity);

            text.enter().append("text")
              .attr("font-size",fontSize)
              .attr("id","d3plus_label_"+d.d3plus.id)
              .attr("class","d3plus_label")
              .attr("opacity",0)
              .call(style,true)
              .transition().duration(vars.draw.timing/2)
              .delay(vars.draw.timing/2)
              .call(opacity);

          }
          else {

            text
              .attr("opacity",1)
              .call(style)
              .call(opacity);

            text.enter().append("text")
              .attr("font-size",fontSize)
              .attr("id","d3plus_label_"+d.d3plus.id)
              .attr("class","d3plus_label")
              .call(style,true)
              .call(opacity);

          }

          text.exit().call(remove);

          if (text.size() == 0 || text.html() == "") {
            delete d.d3plus_label;
            group.selectAll("text#d3plus_label_"+d.d3plus.id+", rect#d3plus_label_bg_"+d.d3plus.id)
              .call(remove);
          }
          else {

            if (label.background) {

              var background_data = ["background"];

              var bounds = copy(text.node().getBBox());
              bounds.width += vars.labels.padding*scale[0];
              bounds.height += vars.labels.padding*scale[0];
              bounds.x -= (vars.labels.padding*scale[0])/2;
              bounds.y -= (vars.labels.padding*scale[0])/2;

            }
            else {
              var background_data = [],
                  bounds = {};
            }

            var bg = group.selectAll("rect#d3plus_label_bg_"+d.d3plus.id)
                       .data(background_data),
                bg_opacity = typeof label.background === "number" ?
                             label.background :
                             typeof label.background === "string" ? 1 : 0.6;

            function bg_style(elem) {

              var color = typeof label.background === "string" ? label.background : vars.background.value === "none"
                        ? "#ffffff" : vars.background.value
                , fill = typeof label.background === "string"
                       ? label.background : color
                , a = label.angle || 0
                , x = label.translate ? bounds.x+bounds.width/2 : 0
                , y = label.translate ? bounds.y+bounds.height/2 : 0
                , transform = "scale("+1/scale[1]+")rotate("+a+","+x+","+y+")";

              elem
                .attr("fill",fill)
                .attr(bounds)
                .attr("transform",transform);

            }

            if (vars.draw.timing) {

              bg.exit().transition().duration(vars.draw.timing)
                .attr("opacity",0)
                .remove();

              bg.transition().duration(vars.draw.timing)
                .attr("opacity",bg_opacity)
                .call(bg_style);

              bg.enter().insert("rect",".d3plus_label")
                .attr("id","d3plus_label_bg_"+d.d3plus.id)
                .attr("class","d3plus_label_bg")
                .attr("opacity",0)
                .call(bg_style)
                .transition().duration(vars.draw.timing)
                  .attr("opacity",bg_opacity);

            }
            else {

              bg.exit().remove();

              bg.enter().insert("rect",".d3plus_label")
                .attr("id","d3plus_label_bg_"+d.d3plus.id)
                .attr("class","d3plus_label_bg");

              bg.attr("opacity",bg_opacity)
                .call(bg_style);

            }

          }

        }
        else {
          delete d.d3plus_label;
          group.selectAll("text#d3plus_label_"+d.d3plus.id+", rect#d3plus_label_bg_"+d.d3plus.id)
            .call(remove);
        }

      }
      else {
        delete d.d3plus_label;
        group.selectAll("text#d3plus_label_"+d.d3plus.id+", rect#d3plus_label_bg_"+d.d3plus.id)
          .call(remove);
      }
    });

    if ( vars.dev.value ) print.timeEnd( timerString );

  }
  else {

    if ( vars.dev.value ) {
      var timerString = "removing " + group + " labels";
      print.time( timerString );
    }

    selection.selectAll("text.d3plus_label, rect.d3plus_label_bg")
      .call(remove);

    vars.g.labels.selectAll("text.d3plus_label, rect.d3plus_label_bg")
      .call(remove);

    if ( vars.dev.value ) print.timeEnd( timerString );

  }
}
