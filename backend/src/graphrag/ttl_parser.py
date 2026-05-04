"""Parse a (subset of) OWL ontologies in Turtle (.ttl) format into a SchemaSpec.

We recognise: owl:Class, owl:ObjectProperty (with rdfs:domain / rdfs:range),
owl:DatatypeProperty (with rdfs:domain and an xsd: range), rdfs:label (English),
and rdfs:comment. Class hierarchies (rdfs:subClassOf), OWL restrictions, and OWL2
axioms are surfaced as warnings rather than honoured — the resulting schema is a
flat list of typed node, relationship, and property declarations.

This is a clean-room implementation; we do not copy from third-party reference
code. rdflib is the only dependency.
"""

from __future__ import annotations

import logging
from typing import Optional

import rdflib
from rdflib import Graph, URIRef
from rdflib.namespace import OWL, RDF, RDFS, XSD

from src.graphrag.schema_model import (
    NodeSpec,
    Pattern,
    PropertySpec,
    PropertyType,
    RelSpec,
    SchemaSpec,
)


_XSD_TO_PROPERTY_TYPE: dict[URIRef, PropertyType] = {
    XSD.string: PropertyType.STRING,
    XSD.normalizedString: PropertyType.STRING,
    XSD.token: PropertyType.STRING,
    XSD.anyURI: PropertyType.STRING,
    XSD.NCName: PropertyType.STRING,
    XSD.byte: PropertyType.INTEGER,
    XSD.short: PropertyType.INTEGER,
    XSD.int: PropertyType.INTEGER,
    XSD.integer: PropertyType.INTEGER,
    XSD.long: PropertyType.INTEGER,
    XSD.unsignedByte: PropertyType.INTEGER,
    XSD.unsignedShort: PropertyType.INTEGER,
    XSD.unsignedInt: PropertyType.INTEGER,
    XSD.unsignedLong: PropertyType.INTEGER,
    XSD.nonNegativeInteger: PropertyType.INTEGER,
    XSD.positiveInteger: PropertyType.INTEGER,
    XSD.float: PropertyType.FLOAT,
    XSD.double: PropertyType.FLOAT,
    XSD.decimal: PropertyType.FLOAT,
    XSD.boolean: PropertyType.BOOLEAN,
    XSD.date: PropertyType.DATE,
    XSD.gYear: PropertyType.DATE,
    XSD.dateTime: PropertyType.LOCAL_DATETIME,
    XSD.dateTimeStamp: PropertyType.LOCAL_DATETIME,
}


def _local_name(iri: rdflib.term.Identifier) -> str:
    s = str(iri)
    for sep in ("#", "/"):
        if sep in s:
            cand = s.rsplit(sep, 1)[1]
            if cand:
                return cand
    return s


def _english_label(g: Graph, subject: URIRef) -> Optional[str]:
    candidate: Optional[str] = None
    for label in g.objects(subject, RDFS.label):
        if isinstance(label, rdflib.Literal):
            if label.language == "en":
                return str(label)
            if candidate is None:
                candidate = str(label)
    return candidate


def _description(g: Graph, subject: URIRef) -> Optional[str]:
    for comment in g.objects(subject, RDFS.comment):
        return str(comment)
    return None


def _classes(g: Graph) -> dict[URIRef, NodeSpec]:
    out: dict[URIRef, NodeSpec] = {}
    for cls in g.subjects(RDF.type, OWL.Class):
        if not isinstance(cls, URIRef):
            continue  # blank-node anonymous classes (e.g., owl:Restriction): skip
        if cls in out:
            continue
        label = _english_label(g, cls) or _local_name(cls)
        out[cls] = NodeSpec(
            label=label,
            description=_description(g, cls),
            properties=[],
        )
    return out


def _xsd_to_property_type(range_iri: rdflib.term.Identifier, warnings: list[str]) -> PropertyType:
    if isinstance(range_iri, URIRef) and range_iri in _XSD_TO_PROPERTY_TYPE:
        return _XSD_TO_PROPERTY_TYPE[range_iri]
    warnings.append(f"Unmapped datatype range '{range_iri}'; defaulting to STRING.")
    return PropertyType.STRING


def _attach_datatype_properties(
    g: Graph, classes: dict[URIRef, NodeSpec], warnings: list[str]
) -> None:
    for prop in g.subjects(RDF.type, OWL.DatatypeProperty):
        if not isinstance(prop, URIRef):
            continue
        domains = list(g.objects(prop, RDFS.domain))
        if not domains:
            warnings.append(
                f"Datatype property '{_local_name(prop)}' has no rdfs:domain; skipped."
            )
            continue
        ranges = list(g.objects(prop, RDFS.range))
        if not ranges:
            ptype = PropertyType.STRING
        else:
            ptype = _xsd_to_property_type(ranges[0], warnings)
        spec = PropertySpec(
            name=_english_label(g, prop) or _local_name(prop),
            type=ptype,
            description=_description(g, prop),
        )
        for domain in domains:
            if not isinstance(domain, URIRef):
                continue
            target = classes.get(domain)
            if target is None:
                # Domain references a class we didn't see declared — declare it
                # so the property has somewhere to live.
                target = NodeSpec(label=_local_name(domain), properties=[])
                classes[domain] = target
                warnings.append(
                    f"Implicit class declaration for '{target.label}' (referenced as rdfs:domain of '{spec.name}')."
                )
            if not any(p.name == spec.name for p in target.properties):
                target.properties.append(spec)


def _build_relationships(
    g: Graph, classes: dict[URIRef, NodeSpec], warnings: list[str]
) -> tuple[list[RelSpec], list[Pattern]]:
    rels: dict[str, RelSpec] = {}
    patterns: list[Pattern] = []
    for prop in g.subjects(RDF.type, OWL.ObjectProperty):
        if not isinstance(prop, URIRef):
            continue
        rel_label = _english_label(g, prop) or _local_name(prop)
        rels.setdefault(
            rel_label,
            RelSpec(label=rel_label, description=_description(g, prop), properties=[]),
        )
        domains = [d for d in g.objects(prop, RDFS.domain) if isinstance(d, URIRef)]
        ranges = [r for r in g.objects(prop, RDFS.range) if isinstance(r, URIRef)]
        if not domains or not ranges:
            warnings.append(
                f"Object property '{rel_label}' has no rdfs:domain/range; pattern will not be inferred."
            )
            continue
        for domain in domains:
            if domain not in classes:
                classes[domain] = NodeSpec(label=_local_name(domain), properties=[])
            for rng in ranges:
                if rng not in classes:
                    classes[rng] = NodeSpec(label=_local_name(rng), properties=[])
                patterns.append(
                    Pattern(
                        source_label=classes[domain].label,
                        rel_label=rel_label,
                        target_label=classes[rng].label,
                    )
                )
    return list(rels.values()), patterns


def _ignored_constructs_warnings(g: Graph) -> list[str]:
    msgs: list[str] = []
    if any(g.subjects(RDF.type, OWL.Restriction)):
        msgs.append("owl:Restriction declarations were ignored.")
    if any(g.triples((None, RDFS.subClassOf, None))):
        msgs.append("rdfs:subClassOf hierarchy was flattened; superclass properties are NOT inherited.")
    if any(g.triples((None, OWL.equivalentClass, None))):
        msgs.append("owl:equivalentClass declarations were ignored.")
    if any(g.triples((None, OWL.inverseOf, None))):
        msgs.append("owl:inverseOf declarations were ignored.")
    return msgs


def parse_owl_ttl(ttl_text: str) -> tuple[SchemaSpec, list[str]]:
    """Parse Turtle ontology text into a SchemaSpec plus a list of warnings."""
    g = Graph()
    try:
        g.parse(data=ttl_text, format="turtle")
    except Exception as exc:
        raise ValueError(f"TTL parse failed: {exc}") from exc

    warnings: list[str] = _ignored_constructs_warnings(g)

    classes = _classes(g)
    _attach_datatype_properties(g, classes, warnings)
    rels, patterns = _build_relationships(g, classes, warnings)

    if not classes:
        raise ValueError(
            "No owl:Class declarations found. This does not appear to be a class-defining ontology."
        )

    spec = SchemaSpec(
        source="ttl",
        nodes=sorted(classes.values(), key=lambda n: n.label),
        relationships=sorted(rels, key=lambda r: r.label),
        patterns=patterns,
    )
    logging.info(
        "Parsed TTL ontology: %d classes, %d relationships, %d patterns, %d warnings",
        len(spec.nodes),
        len(spec.relationships),
        len(spec.patterns),
        len(warnings),
    )
    return spec, warnings
