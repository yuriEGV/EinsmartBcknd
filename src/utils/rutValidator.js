export function validarRUT(rutCompleto) {
    if (typeof rutCompleto !== 'string' || !rutCompleto.trim()) return false;
    
    // Limpiar todo excepto números y K
    let valor = rutCompleto.replace(/[^0-9kK]+/g, '').toUpperCase();
    
    if (valor.length < 2) return false;
    
    let cuerpo = valor.slice(0, -1);
    let dv = valor.slice(-1).toUpperCase();
    
    // Calcular Dígito Verificador
    let suma = 0;
    let multiplo = 2;
    
    // Recorrer el cuerpo de derecha a izquierda
    for (let i = 1; i <= cuerpo.length; i++) {
        let index = multiplo * parseInt(valor.charAt(cuerpo.length - i));
        suma = suma + index;
        if (multiplo < 7) { 
            multiplo = multiplo + 1; 
        } else { 
            multiplo = 2; 
        }
    }
    
    let dvEsperado = 11 - (suma % 11);
    
    // Casos especiales
    dv = (dv === 'K') ? 10 : parseInt(dv);
    dv = (dv === 0) ? 11 : dv;
    
    if (dvEsperado === 11) dvEsperado = 0;
    if (dvEsperado === 10) dvEsperado = 10; // 10 is checked against 'K' logic as 10
    
    return String(dvEsperado) === String(dv);
}

export function formatearRUT(rut) {
    if (!rut) return '';
    let valor = rut.replace(/[^0-9kK]+/g, '').toUpperCase();
    if (valor.length < 2) return valor;
    
    let cuerpo = valor.slice(0, -1);
    let dv = valor.slice(-1);
    
    return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
}
