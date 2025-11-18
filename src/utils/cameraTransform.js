/**
 * Transforms cameras from cameras_detailed.json format to the expected camera format
 * @param {Object} camerasJson - The JSON object from cameras_detailed.json
 * @returns {Array} Array of transformed camera objects
 */
export const transformCamerasFromJson = (camerasJson) => {
  if (!camerasJson || typeof camerasJson !== 'object') {
    return [];
  }

  return Object.values(camerasJson)
    .filter(camera => {
      // Only include active and public cameras with valid coordinates
      if (camera.is_active !== 'true' || camera.is_public !== 'true') {
        return false;
      }
      
      // Validate coordinates
      const lat = parseFloat(camera.latitude);
      const lng = parseFloat(camera.longitude);
      if (isNaN(lat) || isNaN(lng)) {
        return false;
      }
      
      // Validate coordinate ranges (rough bounds for Brazil/Santos)
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return false;
      }
      
      return true;
    })
    .map(camera => {
      // Parse coordinates
      const lat = parseFloat(camera.latitude);
      const lng = parseFloat(camera.longitude);
      
      // Create a descriptive name from available fields
      let name = camera.camera_number || `Câmera ${camera.id}`;
      if (camera.street) {
        name = `${camera.camera_number || 'Câmera'} - ${camera.street}`;
        if (camera.intersection) {
          name += ` / ${camera.intersection}`;
        }
      }

      // Build info string with all details
      const infoParts = [];
      if (camera.neighborhood) infoParts.push(`Bairro: ${camera.neighborhood}`);
      if (camera.camera_type) infoParts.push(`Tipo: ${camera.camera_type}`);
      if (camera.status) infoParts.push(`Status: ${camera.status}`);
      if (camera.organizational_unit) infoParts.push(`Unidade: ${camera.organizational_unit}`);
      if (camera.installation_date) infoParts.push(`Instalação: ${camera.installation_date}`);
      if (camera.original_id) infoParts.push(`ID Original: ${camera.original_id}`);

      const info = infoParts.join(' | ');

      return {
        id: camera.id,
        name: name,
        lat: lat,
        lng: lng,
        link: camera.url || '',
        info: info,
        icon: 'camera',
        // Preserve all original fields for detailed display
        details: {
          camera_number: camera.camera_number,
          original_id: camera.original_id,
          street: camera.street,
          intersection: camera.intersection,
          neighborhood: camera.neighborhood,
          camera_type: camera.camera_type,
          status: camera.status,
          status_id: camera.status_id,
          organizational_unit: camera.organizational_unit,
          installation_date: camera.installation_date,
          is_active: camera.is_active,
          is_public: camera.is_public,
          is_santos_aovivo: camera.is_santos_aovivo,
          utm_x: camera.utm_x,
          utm_y: camera.utm_y,
          created_at: camera.created_at,
          updated_at: camera.updated_at,
        },
        // Note: coverage_area is not in the JSON, so cameras won't have coverage areas
        // This means they'll only be clickable, not auto-detected by location
      };
    });
};

