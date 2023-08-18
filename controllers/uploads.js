const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");
const KMeans = require("node-kmeans");
const cloudinary = require("cloudinary").v2;
cloudinary.config(process.env.CLOUDINARY_URL);

const { response } = require("express");
const { subirArchivo } = require("../helpers");

const { Usuario, Producto } = require("../models");
const cargarArchivo = async (req, res = response) => {
	try {
		// txt, md
		// const nombre = await subirArchivo( req.files, ['txt','md'], 'textos' );
		const nombre = await subirArchivo(req.files, undefined, "imgs");
		res.json({ nombre });
	} catch (msg) {
		res.status(400).json({ msg });
	}
};

const actualizarImagen = async (req, res = response) => {
	const { id, coleccion } = req.params;

	let modelo;

	switch (coleccion) {
		case "usuarios":
			modelo = await Usuario.findById(id).populate({
				path: "sucursal",
				populate: {
					path: "usuario",
					select: "_id nombre", // Asegúrate de seleccionar solo los campos que necesitas en la respuesta
				},
			});
			if (!modelo) {
				return res.status(400).json({
					msg: `No existe un usuario con el id ${id}`,
				});
			}

			break;

		case "productos":
			modelo = await Producto.findById(id);
			if (!modelo) {
				return res.status(400).json({
					msg: `No existe un producto con el id ${id}`,
				});
			}

			break;

		default:
			return res.status(500).json({ msg: "Se me olvidó validar esto" });
	}

	// Limpiar imágenes previas
	if (modelo.img) {
		// Hay que borrar la imagen del servidor
		const pathImagen = path.join(
			__dirname,
			"../uploads",
			coleccion,
			modelo.img
		);
		if (fs.existsSync(pathImagen)) {
			fs.unlinkSync(pathImagen);
		}
	}

	const nombre = await subirArchivo(req.files, undefined, coleccion);
	modelo.img = nombre;

	await modelo.save();

	res.json(modelo);
};

async function getDominantColors(pixels, colorCount = 12) {
	return new Promise((resolve, reject) => {
		KMeans.clusterize(pixels, { k: colorCount }, (err, clusters) => {
			if (err) {
				reject(err);
			} else {
				const dominantColors = clusters.map((cluster) => cluster.centroid);
				resolve(dominantColors);
			}
		});
	});
}

async function setColorFromImage(imageURL) {
	try {
		const pixels = await getPixelsFromImage(imageURL);
		const dominantColors = await getDominantColors(pixels);
		const closestColors = dominantColors.map((color) => getClosestColor(color));
		const mostFrequentColor = getMostFrequentColor(closestColors);
		return mostFrequentColor;
	} catch (error) {
		console.error("Error al obtener el color predominante:", error);
		return "sin determinar";
	}
}

const colorPalette = {
	Rojo: [255, 0, 0],
	Naranja: [255, 165, 0],
	Amarillo: [255, 255, 0],
	Verde: [0, 128, 0],
	Azul: [0, 0, 255],
	Marrón: [139, 69, 19],
	Blanco: [255, 255, 255],
	Negro: [0, 0, 0],
};

const getClosestColor = (rgb) => {
	let minDistance = Infinity;
	let closestColor = "Sin determinar";

	Object.entries(colorPalette).forEach(([colorName, colorRGB]) => {
		const distance = colorDistance(rgb, colorRGB);
		if (distance < minDistance) {
			minDistance = distance;
			closestColor = colorName;
		}
	});

	return closestColor;
};

const getMostFrequentColor = (colors) => {
	const colorFrequency = {};

	for (const color of colors) {
		if (colorFrequency[color]) {
			colorFrequency[color]++;
		} else {
			colorFrequency[color] = 1;
		}
	}

	let mostFrequentColor = "Sin determinar";
	let maxFrequency = 0;

	for (const [color, frequency] of Object.entries(colorFrequency)) {
		if (frequency > maxFrequency) {
			maxFrequency = frequency;
			mostFrequentColor = color;
		}
	}

	return mostFrequentColor;
};

const colorDistance = (rgb1, rgb2) => {
	const [r1, g1, b1] = rgb1;
	const [r2, g2, b2] = rgb2;

	const dr = r1 - r2;
	const dg = g1 - g2;
	const db = b1 - b2;

	return Math.sqrt(dr * dr + dg * dg + db * db);
};

async function getPixelsFromImage(imagePath, targetPixels = 100) {
	return new Promise((resolve, reject) => {
		Jimp.read(imagePath)
			.then((image) => {
				const width = image.bitmap.width;
				const height = image.bitmap.height;

				// Calcular el factor de escala para obtener aproximadamente 100 píxeles
				const currentPixels = width * height;
				const scaleFactor = Math.sqrt(targetPixels / currentPixels);

				// Cambiar el tamaño de la imagen
				const newWidth = Math.floor(width * scaleFactor);
				const newHeight = Math.floor(height * scaleFactor);
				image.resize(newWidth, newHeight);

				const pixels = [];

				for (let y = 0; y < newHeight; y++) {
					for (let x = 0; x < newWidth; x++) {
						const color = Jimp.intToRGBA(image.getPixelColor(x, y));
						pixels.push([color.r, color.g, color.b]);
					}
				}

				resolve(pixels);
			})
			.catch((err) => {
				reject(err);
			});
	});
}

const actualizarImagenCloudinary = async (req, res = response) => {
	const { id, coleccion } = req.params;

	let modelo;

	switch (coleccion) {
		case "usuarios":
			modelo = await Usuario.findById(id).populate({
				path: "sucursal",
				populate: {
					path: "usuario",
					select: "_id nombre", // Asegúrate de seleccionar solo los campos que necesitas en la respuesta
				},
			});
			if (!modelo) {
				return res.status(400).json({
					msg: `No existe un usuario con el id ${id}`,
				});
			}

			break;

		case "productos":
			modelo = await Producto.findById(id)
				.populate("usuario", "nombre")
				.populate("categoria", "nombre");

			console.log(modelo);

			if (!modelo) {
				return res.status(400).json({
					msg: `No existe un producto con el id ${id}`,
				});
			}

			break;

		default:
			return res.status(500).json({ msg: "Se me olvidó validar esto" });
	}

	// Limpiar imágenes previas
	if (modelo.img) {
		const nombreArr = modelo.img.split("/");
		const nombre = nombreArr[nombreArr.length - 1];
		const [public_id] = nombre.split(".");
		cloudinary.uploader.destroy(public_id);
	}

	const { tempFilePath } = req.files.archivo;
	const { secure_url } = await cloudinary.uploader.upload(tempFilePath);
	modelo.img = secure_url;

	// Establecer el color predominante en la imagen
	modelo.color = await setColorFromImage(secure_url);

	await modelo.save();

	res.json(modelo);
};

const mostrarImagen = async (req, res = response) => {
	const { id, coleccion } = req.params;

	let modelo;

	switch (coleccion) {
		case "usuarios":
			modelo = await Usuario.findById(id);
			if (!modelo) {
				return res.status(400).json({
					msg: `No existe un usuario con el id ${id}`,
				});
			}

			break;

		case "productos":
			modelo = await Producto.findById(id);

			if (!modelo) {
				return res.status(400).json({
					msg: `No existe un producto con el id ${id}`,
				});
			}

			break;

		default:
			return res.status(500).json({ msg: "Se me olvidó validar esto" });
	}

	// Limpiar imágenes previas
	if (modelo.img) {
		// Hay que borrar la imagen del servidor
		const pathImagen = path.join(
			__dirname,
			"../uploads",
			coleccion,
			modelo.img
		);
		if (fs.existsSync(pathImagen)) {
			return res.sendFile(pathImagen);
		}
	}

	const pathImagen = path.join(__dirname, "../assets/no-image.jpg");
	res.sendFile(pathImagen);
};

module.exports = {
	cargarArchivo,
	actualizarImagen,
	mostrarImagen,
	actualizarImagenCloudinary,
};
