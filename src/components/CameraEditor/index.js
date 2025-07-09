import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import { fromLonLat } from 'ol/proj';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import './styles.css';

const CameraEditor = () => {
  const mapRef = useRef();
  const mapObject = useRef(null);
  const markerSource = useRef(new VectorSource());
  const drawSource = useRef(new VectorSource());

  const [cameraDetails, setCameraDetails] = useState({
    name: '',
    lat: '',
    lng: '',
    link: '',
    info: '',
    icon: 'MdCameraAlt',
  });

  useEffect(() => {
    if (mapObject.current || !mapRef.current) return;

    mapObject.current = new Map({
      target: mapRef.current.id,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: markerSource.current,
        }),
        new VectorLayer({
          source: drawSource.current,
          style: new Style({
            // Estilo para o polígono de cobertura
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([-46.308861, -23.985111]), // Centro padrão (Santos)
        zoom: 15,
      }),
    });

    return () => {
      if (mapObject.current) {
        mapObject.current.setTarget(undefined);
        mapObject.current = null;
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCameraDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCamera = () => {
    // Lógica para salvar a câmera no Supabase
    console.log('Saving camera:', cameraDetails);
  };

  return (
    <Container fluid className=camera-editor-container>
      <Row>
        <Col md={6}>
          <Card className=mb-3>
            <Card.Header>Detalhes da Câmera</Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className=mb-3>
                  <Form.Label>Nome</Form.Label>
                  <Form.Control
                    type=text
                    name=name
                    value={cameraDetails.name}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Row>
                  <Col>
                    <Form.Group className=mb-3>
                      <Form.Label>Latitude</Form.Label>
                      <Form.Control
                        type=number
                        name=lat
                        value={cameraDetails.lat}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className=mb-3>
                      <Form.Label>Longitude</Form.Label>
                      <Form.Control
                        type=number
                        name=lng
                        value={cameraDetails.lng}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className=mb-3>
                  <Form.Label>Link da Imagem</Form.Label>
                  <Form.Control
                    type=text
                    name=link
                    value={cameraDetails.link}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Form.Group className=mb-3>
                  <Form.Label>Informações</Form.Label>
                  <Form.Control
                    as=textarea
                    name=info
                    value={cameraDetails.info}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Form.Group className=mb-3>
                  <Form.Label>Ícone (MdCameraAlt)</Form.Label>
                  <Form.Control
                    type=text
                    name=icon
                    value={cameraDetails.icon}
                    onChange={handleInputChange}
                  />
                </Form.Group>
                <Button variant=primary onClick={handleSaveCamera}>
                  Salvar Câmera
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>Área de Cobertura no Mapa</Card.Header>
            <Card.Body>
              <div id=camera-editor-map ref={mapRef} style={{ width: '100%', height: '400px' }}></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CameraEditor;
