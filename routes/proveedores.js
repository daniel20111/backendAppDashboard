//rutas para proveedores
const { Router } = require("express");

const { validarJWT, validarCampos, esAdminRole } = require("../middlewares");

const {
    obtenerProveedores,
    obtenerProveedor,
    crearProveedor,
    actualizarProveedor,
    borrarProveedor,
} = require("../controllers/proveedores");

const router = Router();

/**
 * Rutas para obtener y crear proveedores
 */

//  Obtener todas los proveedores - público
router.get("/", obtenerProveedores);

// Obtener proveedor por ID - público
router.get("/:id", obtenerProveedor);

// Crear proveedor - privado - cualquier persona con un token válido
router.post("/", [validarJWT, validarCampos], crearProveedor);


module.exports = router;
