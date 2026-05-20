import logging
from typing import Dict, Any, Optional
from jinja2 import Environment, FileSystemLoader, Template
import os

logger = logging.getLogger(__name__)

class TemplateManager:
    """
    Manages journey message templates using Jinja2.
    Loads templates from a directory and renders them with dynamic context.
    """
    def __init__(self, templates_dir: Optional[str] = None):
        if not templates_dir:
            # Default to agent/journey/templates
            base_dir = os.path.dirname(os.path.abspath(__file__))
            templates_dir = os.path.join(base_dir, "templates")
            
        if not os.path.exists(templates_dir):
            os.makedirs(templates_dir, exist_ok=True)
            logger.info(f"Created templates directory: {templates_dir}")
            
        self.env = Environment(loader=FileSystemLoader(templates_dir))
        self.templates_dir = templates_dir

    def render(self, template_name: str, context: Dict[str, Any]) -> str:
        """
        Render a template with the given context.
        
        Args:
            template_name: Name of the template file (e.g., 'logistics.j2')
            context: Data for template rendering
            
        Returns:
            Rendered string
        """
        try:
            template = self.env.get_template(template_name)
            return template.render(**context)
        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {e}")
            # Fallback to a simple string if template fails
            return f"Notification: {template_name} (data: {context})"

    def add_template(self, name: str, content: str):
        """Add or update a template file."""
        path = os.path.join(self.templates_dir, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info(f"Updated template: {name}")

# Global instance
_template_manager = None

def get_template_manager() -> TemplateManager:
    global _template_manager
    if _template_manager is None:
        _template_manager = TemplateManager()
    return _template_manager
