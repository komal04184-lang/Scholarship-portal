const soap = require('soap');
const fs = require('fs');
const path = require('path');
const express = require('express');
const scholarshipService = require('./scholarshipService');
const studentService = require('./studentService');
const documentService = require('./documentService');

const xsdPath = path.join(__dirname, 'xsd', 'scholarship.xsd');
const xsdContent = fs.readFileSync(xsdPath, 'utf8')
  .replace(/<\?xml.*?\?>/g, '')
  .replace(/<xs:schema[^>]*>/, '')
  .replace(/<\/xs:schema>/, '');

// Complete WSDL 1.1 definition for Scholarship Portal Web Services
const wsdlXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="ScholarshipPortalService"
             targetNamespace="http://scholarship.portal.gov.in/ws"
             xmlns="http://schemas.xmlsoap.org/wsdl/"
             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
             xmlns:tns="http://scholarship.portal.gov.in/ws"
             xmlns:xs="http://www.w3.org/2001/XMLSchema">

  <types>
    <xs:schema targetNamespace="http://scholarship.portal.gov.in/ws" elementFormDefault="qualified">
      ${xsdContent}
    </xs:schema>
  </types>

  <!-- Message Definitions -->
  <message name="GetScholarshipInput">
    <part name="parameters" element="tns:GetScholarshipRequest"/>
  </message>
  <message name="GetScholarshipOutput">
    <part name="parameters" element="tns:GetScholarshipResponse"/>
  </message>

  <message name="ListScholarshipsInput">
    <part name="parameters" element="tns:ListScholarshipsRequest"/>
  </message>
  <message name="ListScholarshipsOutput">
    <part name="parameters" element="tns:ListScholarshipsResponse"/>
  </message>

  <message name="CheckEligibilityInput">
    <part name="parameters" element="tns:CheckEligibilityRequest"/>
  </message>
  <message name="CheckEligibilityOutput">
    <part name="parameters" element="tns:CheckEligibilityResponse"/>
  </message>

  <message name="GetStudentInput">
    <part name="parameters" element="tns:GetStudentRequest"/>
  </message>
  <message name="GetStudentOutput">
    <part name="parameters" element="tns:GetStudentResponse"/>
  </message>

  <message name="GetDocumentStatusInput">
    <part name="parameters" element="tns:GetDocumentStatusRequest"/>
  </message>
  <message name="GetDocumentStatusOutput">
    <part name="parameters" element="tns:GetDocumentStatusResponse"/>
  </message>

  <!-- Port Types -->
  <portType name="ScholarshipPortType">
    <operation name="GetScholarship">
      <input message="tns:GetScholarshipInput"/>
      <output message="tns:GetScholarshipOutput"/>
    </operation>
    <operation name="ListScholarships">
      <input message="tns:ListScholarshipsInput"/>
      <output message="tns:ListScholarshipsOutput"/>
    </operation>
    <operation name="CheckEligibility">
      <input message="tns:CheckEligibilityInput"/>
      <output message="tns:CheckEligibilityOutput"/>
    </operation>
  </portType>

  <portType name="StudentPortType">
    <operation name="GetStudent">
      <input message="tns:GetStudentInput"/>
      <output message="tns:GetStudentOutput"/>
    </operation>
  </portType>

  <portType name="DocumentPortType">
    <operation name="GetDocumentStatus">
      <input message="tns:GetDocumentStatusInput"/>
      <output message="tns:GetDocumentStatusOutput"/>
    </operation>
  </portType>

  <!-- Bindings -->
  <binding name="ScholarshipBinding" type="tns:ScholarshipPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="GetScholarship">
      <soap:operation soapAction="http://scholarship.portal.gov.in/ws/GetScholarship"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="ListScholarships">
      <soap:operation soapAction="http://scholarship.portal.gov.in/ws/ListScholarships"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="CheckEligibility">
      <soap:operation soapAction="http://scholarship.portal.gov.in/ws/CheckEligibility"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>

  <binding name="StudentBinding" type="tns:StudentPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="GetStudent">
      <soap:operation soapAction="http://scholarship.portal.gov.in/ws/GetStudent"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>

  <binding name="DocumentBinding" type="tns:DocumentPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="GetDocumentStatus">
      <soap:operation soapAction="http://scholarship.portal.gov.in/ws/GetDocumentStatus"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>

  <!-- Services -->
  <service name="ScholarshipPortalService">
    <port name="ScholarshipPort" binding="tns:ScholarshipBinding">
      <soap:address location="http://localhost:3000/soap"/>
    </port>
    <port name="StudentPort" binding="tns:StudentBinding">
      <soap:address location="http://localhost:3000/soap"/>
    </port>
    <port name="DocumentPort" binding="tns:DocumentBinding">
      <soap:address location="http://localhost:3000/soap"/>
    </port>
  </service>
</definitions>`;

const combinedServices = {
  ScholarshipPortalService: {
    ScholarshipPort: scholarshipService.ScholarshipPort,
    StudentPort: studentService.StudentPort,
    DocumentPort: documentService.DocumentPort,
  },
};

function setupSoapServer(app) {
  // Expose WSDL route directly
  app.get('/wsdl', (req, res) => {
    res.setHeader('Content-Type', 'text/xml');
    res.send(wsdlXml);
  });

  // Serve static xsd
  app.use('/xsd', express.static(path.join(__dirname, 'xsd')));

  // Attach SOAP listener to Express app
  soap.listen(app, '/soap', combinedServices, wsdlXml, () => {
    console.log('✓ SOAP Web Service active at /soap (WSDL available at /wsdl and /soap?wsdl)');
  });
}

module.exports = {
  setupSoapServer,
  wsdlXml,
};
