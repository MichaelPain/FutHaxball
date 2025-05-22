/**
 * AdminUI.js - Componente React per l'interfaccia utente del pannello di amministrazione
 * 
 * Questo file implementa l'interfaccia utente del pannello di amministrazione,
 * inclusi dashboard, gestione utenti, moderazione e configurazione.
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, Redirect } from 'react-router-dom';
import axios from 'axios';
import { 
  Container, Row, Col, Nav, Card, Button, Alert, 
  Table, Form, Modal, Badge, Tabs, Tab, Spinner 
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faUsers, faUserShield, faCog, faList, 
  faTrophy, faCalendarAlt, faGlobe, faChartLine 
} from '@fortawesome/free-solid-svg-icons';

// Componenti interni
import Dashboard from './admin/Dashboard';
import UserManagement from './admin/UserManagement';
import UserDetails from './admin/UserDetails';
import AdminManagement from './admin/AdminManagement';
import Moderation from './admin/Moderation';
import SystemConfig from './admin/SystemConfig';
import AdminLogs from './admin/AdminLogs';
import TwoFactorSetup from './admin/TwoFactorSetup';

/**
 * Componente principale del pannello di amministrazione
 */
const AdminUI = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  
  // Verifica l'accesso al pannello di amministrazione
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Accesso negato. Effettua il login.');
          setLoading(false);
          return;
        }
        
        const response = await axios.get('/api/admin/access', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setAdmin(response.data.admin);
          setError(null);
        } else {
          setError(response.data.message || 'Errore durante la verifica dell\'accesso.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Errore durante la verifica dell\'accesso.');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAccess();
  }, []);
  
  // Gestisce il cambio di sezione
  const handleSectionChange = (section) => {
    setActiveSection(section);
  };
  
  // Verifica se l'amministratore ha un permesso specifico
  const hasPermission = (permission) => {
    if (!admin) return false;
    
    // Super admin ha tutti i permessi
    if (admin.role === 'super_admin') return true;
    
    return admin.permissions.includes(permission);
  };
  
  // Rendering durante il caricamento
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="sr-only">Caricamento...</span>
        </Spinner>
      </Container>
    );
  }
  
  // Rendering in caso di errore
  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <Alert.Heading>Errore di accesso</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={() => window.location.href = '/'}>
              Torna alla home
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }
  
  // Rendering del pannello di amministrazione
  return (
    <Container fluid className="admin-panel">
      <Row>
        {/* Sidebar */}
        <Col md={2} className="bg-dark text-white sidebar">
          <div className="sidebar-header p-3">
            <h3>Pannello Admin</h3>
            <p>{admin.nickname} <Badge variant={getRoleBadgeVariant(admin.role)}>{admin.role}</Badge></p>
          </div>
          <Nav className="flex-column">
            <Nav.Link 
              className={activeSection === 'dashboard' ? 'active' : ''} 
              onClick={() => handleSectionChange('dashboard')}
            >
              <FontAwesomeIcon icon={faHome} /> Dashboard
            </Nav.Link>
            
            {hasPermission('view_users') && (
              <Nav.Link 
                className={activeSection === 'users' ? 'active' : ''} 
                onClick={() => handleSectionChange('users')}
              >
                <FontAwesomeIcon icon={faUsers} /> Utenti
              </Nav.Link>
            )}
            
            {(admin.role === 'super_admin' || admin.role === 'admin') && (
              <Nav.Link 
                className={activeSection === 'admins' ? 'active' : ''} 
                onClick={() => handleSectionChange('admins')}
              >
                <FontAwesomeIcon icon={faUserShield} /> Amministratori
              </Nav.Link>
            )}
            
            {hasPermission('view_reports') && (
              <Nav.Link 
                className={activeSection === 'moderation' ? 'active' : ''} 
                onClick={() => handleSectionChange('moderation')}
              >
                <FontAwesomeIcon icon={faList} /> Moderazione
              </Nav.Link>
            )}
            
            {hasPermission('create_tournaments') && (
              <Nav.Link 
                className={activeSection === 'tournaments' ? 'active' : ''} 
                onClick={() => handleSectionChange('tournaments')}
              >
                <FontAwesomeIcon icon={faTrophy} /> Tornei
              </Nav.Link>
            )}
            
            {hasPermission('create_events') && (
              <Nav.Link 
                className={activeSection === 'events' ? 'active' : ''} 
                onClick={() => handleSectionChange('events')}
              >
                <FontAwesomeIcon icon={faCalendarAlt} /> Eventi
              </Nav.Link>
            )}
            
            {hasPermission('create_championships') && (
              <Nav.Link 
                className={activeSection === 'championships' ? 'active' : ''} 
                onClick={() => handleSectionChange('championships')}
              >
                <FontAwesomeIcon icon={faGlobe} /> Campionati
              </Nav.Link>
            )}
            
            {hasPermission('edit_game_config') && (
              <Nav.Link 
                className={activeSection === 'config' ? 'active' : ''} 
                onClick={() => handleSectionChange('config')}
              >
                <FontAwesomeIcon icon={faCog} /> Configurazione
              </Nav.Link>
            )}
            
            {hasPermission('view_logs') && (
              <Nav.Link 
                className={activeSection === 'logs' ? 'active' : ''} 
                onClick={() => handleSectionChange('logs')}
              >
                <FontAwesomeIcon icon={faChartLine} /> Log
              </Nav.Link>
            )}
          </Nav>
          
          <div className="sidebar-footer p-3">
            <Button variant="outline-light" size="sm" onClick={() => window.location.href = '/'}>
              Torna al gioco
            </Button>
          </div>
        </Col>
        
        {/* Contenuto principale */}
        <Col md={10} className="main-content">
          {activeSection === 'dashboard' && <Dashboard admin={admin} />}
          {activeSection === 'users' && <UserManagement admin={admin} />}
          {activeSection === 'admins' && <AdminManagement admin={admin} />}
          {activeSection === 'moderation' && <Moderation admin={admin} />}
          {activeSection === 'tournaments' && <div>Gestione Tornei (In sviluppo)</div>}
          {activeSection === 'events' && <div>Gestione Eventi (In sviluppo)</div>}
          {activeSection === 'championships' && <div>Gestione Campionati (In sviluppo)</div>}
          {activeSection === 'config' && <SystemConfig admin={admin} />}
          {activeSection === 'logs' && <AdminLogs admin={admin} />}
        </Col>
      </Row>
    </Container>
  );
};

/**
 * Funzione di utilità per ottenere la variante del badge in base al ruolo
 * @param {String} role - Ruolo dell'amministratore
 * @returns {String} Variante del badge
 */
const getRoleBadgeVariant = (role) => {
  switch (role) {
    case 'super_admin': return 'danger';
    case 'admin': return 'warning';
    case 'moderator': return 'info';
    default: return 'secondary';
  }
};

export default AdminUI;
