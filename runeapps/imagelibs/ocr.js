///<reference path="/runeappslib.js"/>
///<reference path="../lib/alt1liblegacy.ts"/>
"use strict";


function OCR() { }
OCR.printcharscores = false;


//unblends a imagebuffer into match strength with given color
//an optional second bgimg can be used to get an exact result instead of approximation
OCR.unblendbuffer = function (img, r, g, b, shadow, shadowcheck, bgimg) {
	if (bgimg && (img.width != bgimg.width || img.height != bgimg.height)) { throw "bgimg size doesn't match"; }
	var rimg = new ImageData(img.width, img.height);
	for (var i = 0; i < img.data.length; i += 4) {
		var bg = bgimg ? [bgimg.data[i], bgimg.data[i + 1], bgimg.data[i + 2]] : null;
		var col = OCR.fontcheckcol(img.data[i], img.data[i + 1], img.data[i + 2], r, g, b, shadow, shadowcheck, bg);
		rimg.data[i] = col[0];
		rimg.data[i + 1] = col[1];
		rimg.data[i + 2] = col[2];
		rimg.data[i + 3] = 255;
	}
	return rimg;
}

//determines the amount a given pixel matches the font color, if the background color is known the presicion is enhanced
OCR.fontcheckcol = function (r, g, b, rf, gf, bf, shadow, shadowcheck, bg) {
	if (bg) {
		var col = OCR.decompose2col(r, g, b, rf, gf, bf, bg[0], bg[1], bg[2]);

		var noise = Math.round(Math.abs(col[2] * 100));
		var ra = Math.round(Math.max(0, (col[0] - col[1]) * 255) - col[2]);
		if (!shadow) {
			return [ra, ra, noise];
		}
		else {
			var ra = Math.round(col[0] * 255);
			var rb = Math.round((1 - col[0] - col[1]) * 255);
			return [ra, rb, noise];
		}
	}
	else {
		if (!shadow) {
			var alpha = OCR.getAlpha(r, g, b, rf, gf, bf);
			var ra = Math.round(alpha * 255);
			return [ra, ra, ra];
		}
		else {
			var result = OCR.getAlphaBlack(r, g, b, rf, gf, bf);
			var ra = Math.round(result[0] * result[1] * 255);
			var rb = Math.round(result[0] * (1 - result[1]) * 255);
			return [ra, rb, ra];
		}
	}
}

//decomposes a color in 2 given component colors and returns the amount of each color present
//also return a third (noise) component which is the the amount leftover orthagonal from the 2 given colors
OCR.decompose2col = function (rp, gp, bp, r1, g1, b1, r2, g2, b2) {
	//get the normal of the error (cross-product of both colors)
	var r3 = g1 * b2 - g2 * b1;
	var g3 = b1 * r2 - b2 * r1;
	var b3 = r1 * g2 - r2 * g1;

	var col = OCR.decompose3col(rp, gp, bp, r1, g1, b1, r2, g2, b2, r3, g3, b3);
	var noise = Math.abs(col[2] * Math.sqrt(r3 * r3 + g3 * g3 + b3 * b3));
	return [col[0], col[1], noise];
}

//decomposes a color in 3 given component colors and returns the amount of each color present
OCR.decompose3col = function (rp, gp, bp, r1, g1, b1, r2, g2, b2, r3, g3, b3) {
	//P=x*C1+y*C2+z*C3
	//assemble as matrix 
	//M*w=p
	//get inverse of M
	//dirty written out version of cramer's rule
	var A = g2 * b3 - b2 * g3;
	var B = g3 * b1 - b3 * g1;
	var C = g1 * b2 - b1 * g2;

	var D = b2 * r3 - r2 * b3;
	var E = b3 * r1 - r3 * b1;
	var F = b1 * r2 - r1 * b2;

	var G = r2 * g3 - g2 * r3;
	var H = r3 * g1 - g3 * r1;
	var I = r1 * g2 - g1 * r2;

	var det = r1 * A + g1 * D + b1 * G;

	//M^-1*p=w
	var x = (A * rp + D * gp + G * bp) / det;
	var y = (B * rp + E * gp + H * bp) / det;
	var z = (C * rp + F * gp + I * bp) / det;

	return [x, y, z];
}

/*
//gets the maximum alpha of r,g,b mixed with black in observed color rp,gp,bp
OCR.getAlphaBlack = function (rp, gp, bp, r, g, b) {
	var inpr = rp * bp + gp * g + bp * b;
	var mag = r * r + g * g + b * b;
	var colorness = Math.max(0, Math.min(1, inpr / mag));
	var r2 = colorness * r;
	var g2 = colorness * g;
	var b2 = colorness * b;
	var alpha = OCR.getAlpha(rp, gp, bp, r2, g2, b2);
	return [alpha * colorness, alpha * (1 - colorness)];
}
*/
//gets the maximum alpha of r,g,b mixed with black in observed color rp,gp,bp
//TODO is this to cheapy? if this is actually the solution remove this funcion and inline it
OCR.getAlphaBlack = function (rp, gp, bp, r, g, b) {
	return [
		OCR.getAlpha(rp, gp, bp, r, g, b),
		OCR.getAlpha(rp, gp, bp, 0, 0, 0)
	];
}

//gets the maximum alpha of r,g,b in observed color rp,gp,bp
OCR.getAlpha = function (rp, gp, bp, r, g, b) {
	return 1 - Math.max(Math.abs(rp - r), Math.abs(gp - g), Math.abs(bp - b)) / 2 / 255;
}

//brute force to the exact position of the text
OCR.findChar = function (buffer, font,col, x, y, w, h) {
	var shiftx = 0;
	var shifty = 0;

	if (x < 0) { return null; }
	if (y - font.basey < 0) { return null; }
	if (x + w + font.width > buffer.width) { return null; }
	if (y + h - font.basey + font.height > buffer.height) { return null; }

	var best = 0.0;
	var bestchar = null;
	for (var cx = x; cx < x + w; cx++) {
		for (var cy = y; cy < y + h; cy++) {
			var chr = OCR.readChar(buffer, font, col, cx, cy, false, false);
			if (chr != null && chr.sizescore > best) {
				best = chr.sizescore;
				bestchar = chr;
			}
		}
	}
	return bestchar;
}

//reads text with unknown exact coord or color. The given coord should be inside the text
//color selection not implemented yet
OCR.findReadLine = function (buffer, font, cols, x, y) {
	var chr = OCR.findChar(buffer, font, cols[0], x - 5, y-1, 12, 7);
	if (chr == null) { return null; }
	return OCR.readLine(buffer, font, cols[0], chr.x, chr.y, true, true);
}

//reads a line of text with exactly known position and color. y should be the y coord of the text base line, x should be the first pixel of a new character
OCR.readLine = function (buffer, font,col, x, y, forward, backward) {
	var dx = 0;
	var r = "";
	var triedspace = false;
	var x1 = x;
	var x2 = x;
	if (forward) {
		while (true)//keep going till no char found
		{
			var chr = OCR.readChar(buffer, font, col, x + dx, y, false, true);
			if (chr == null) {
				if (triedspace) { x2 = x + dx - font.spacewidth; break; }
				else { dx += font.spacewidth; triedspace = true; continue; }
			}
			else {
				if (triedspace) { r += " "; triedspace = false; }
				r += chr.chr;
				dx += chr.basechar.width;
			}
		}
	}
	if (backward) {
		dx = 0;
		triedspace = false;
		while (true)//keep going till no char found
		{
			var chr = OCR.readChar(buffer, font, col, x + dx, y, true, true);
			if (chr == null) {
				if (triedspace) { x1 = x + dx + font.spacewidth; break; }
				else { dx -= font.spacewidth; triedspace = true; continue; }
			}
			else {
				if (triedspace) { r = " " + r; triedspace = false; }
				r = chr.chr + r;
				dx -= chr.basechar.width;
			}
		}
	}
	return {
		debugArea: { x: x1, y: y - 9, w: x2 - x1, h: 10 },
		text: r
	};
}

OCR.readChar = function (buffer, font, col, x, y, backwards, allowSecondary) {
	y -= font.basey;
	var shiftx = 0;
	var shifty = font.basey;
	var shadow = font.shadow;
	var fr = col[0], fg = col[1], fb = col[2];

	//===== make sure the full domain is inside the bitmap/buffer ======
	if (y < 0 || y + font.height >= buffer.height) { return null; }
	if (!backwards) {
		if (x < 0 || x + font.width > buffer.width) { return null; }
	}
	else {
		if (x - font.width < 0 || x > buffer.width) { return null; }
	}

	//====== start reading the char ======
	var scores = [];
	for (var chr = 0; chr < font.chars.length; chr++) {
		var chrobj = font.chars[chr];
		var chrpixels = chrobj.pixels;
		scores[chr] = { score: 1, sizescore: 0, chr: chrobj };
		var chrx = (backwards ? x - chrobj.width : x);
		for (var a = 0; a < chrobj.pixels.length;) {
			var i = (chrx + chrobj.pixels[a]) * 4 + (y + chrobj.pixels[a + 1]) * buffer.width * 4;
			var penalty = 0;
			if (!shadow) {
				var alpha = OCR.getAlpha(buffer.data[i], buffer.data[i + 1], buffer.data[i + 2], fr, fg, fb);
				penalty += Math.min(0, alpha - chrobj.pixels[a + 2] / 255);
				a += 3;
			}
			else {
				var p = OCR.getAlphaBlack(buffer.data[i], buffer.data[i + 1], buffer.data[i + 2], fr, fg, fb);
				penalty += Math.min(0, p[0] - chrobj.pixels[a + 2] / 255);
				penalty += Math.min(0, p[1] - chrobj.pixels[a + 3] / 255);
				a += 4;
			}
			//scores[chr].score += Math.max(-0.1, penalty);
			scores[chr].score += penalty;
		}
		scores[chr].sizescore = scores[chr].score + chrobj.bonus;
	}
	if (OCR.printcharscores) {
		scores.slice().sort((a, b) =>a.sizescore - b.sizescore).slice(-6).forEach(q=> qw(q.chr.chr, q.score.toFixed(3), q.sizescore.toFixed(3)));
	}

	var bestsize = 0;
	var bestrating = 0;
	var bestindex = -1;

	var bestsecondsize = 0;
	var bestsecondrating = 0;
	var bestsecondindex = -1;

	for (var i = 0; i < scores.length; i++) {
		if (!font.chars[i].secondary && scores[i].sizescore > bestsize) {
			bestsize = scores[i].sizescore;
			bestindex = i;
			bestrating = scores[i].score;
		}
		if (font.chars[i].secondary && scores[i].sizescore > bestsecondsize) {
			bestsecondsize = scores[i].sizescore;
			bestsecondindex = i;
			bestsecondrating = scores[i].score;
		}
	}

	var winchr = null;
	var winindex = -1;
	if (bestrating > (font.minrating != null ? font.minrating : 0.92)) {
		winindex = bestindex;
		winchr = font.chars[winindex];
	}
	else if (allowSecondary && bestsecondrating > 0.92) {
		winindex = bestsecondindex;
		winchr = font.chars[winindex];
	}

	if (winchr == null) { return null; }
	return { chr: winchr.chr, basechar: winchr, x: x + shiftx, y: y + shifty, score: scores[winindex].score, sizescore: scores[winindex].sizescore };
}


OCR.generatefont = function (unblended, chars, seconds, bonusses, basey, spacewidth, treshold, shadow) {
	var a, b, c, d, e, i2, x, y, de, dx, domains, chr;
	//settings vars
	treshold *= 255;

	//initial vars
	var miny = unblended.height - 1;
	var maxy = 0;
	var font = { chars: [], width: 0, spacewidth: spacewidth, shadow: shadow };
	var ds = false;

	//index all chars
	for (dx = 0; dx < unblended.width; dx++) {
		var i = 4 * dx + 4 * unblended.width * (unblended.height - 1);

		if (unblended.data[i] == 255) {
			if (ds === false) { ds = dx; }
		}
		else {
			if (ds !== false) {
				//char found, start detection
				de = dx;
				var char = chars[font.chars.length];
				chr = {
					ds: ds,
					de: de,
					width: de - ds,
					chr: char,
					bonus: bonusses[char] || 0,
					secondary: seconds.indexOf(chars[font.chars.length]) != -1,
					pixels: []
				};
				font.chars.push(chr);
				font.width = Math.max(font.width, chr.width);

				for (x = 0; x < de - ds; x++) {
					for (y = 0; y < unblended.height - 1; y++) {
						var i = (x + ds) * 4 + y * unblended.width * 4;
						if (unblended.data[i] + (shadow? unblended.data[i + 1] :0)>= treshold) {
							miny = Math.min(miny, y);
							maxy = Math.max(maxy, y);
						}
					}
				}
				ds = false;
			}
		}
	}
	font.height = maxy + 1 - miny;
	font.basey = basey - miny;

	//detect all pixels
	for (var a in font.chars) {
		var chr = font.chars[a];
		var b = 0;
		for (var x = 0; x < chr.width; x++) {
			for (var y = 0; y < maxy+1 - miny; y++) {
				var i = (x + chr.ds) * 4 + (y + miny) * unblended.width * 4;
				if (unblended.data[i] + (shadow ? unblended.data[i + 1] : 0) >= treshold) {
					chr.pixels.push(x, y);
					chr.pixels.push(unblended.data[i]);
					if (shadow) { chr.pixels.push(unblended.data[i + 1]); }
					chr.bonus += 0.002;
				}
			}
		}
		//remove process vars from final json obj
		delete chr.ds;
		delete chr.de;
		//prevent js from doing the thing with unnecessary output precision
		chr.bonus = +chr.bonus.toFixed(3);
	}

	return font;
}