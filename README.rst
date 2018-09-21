#######################
Slurm Visualisation App
#######################

.. contents:: Table of contents

An grafana app plugin to monitoring/visualise slurm clusters and workloads.

.. figure:: https://raw.githubusercontent.com/stackhpc/slurm-visualisation-app/master/images/darwin-slurm-visualisation.png
    :alt: Slurm panel

.. figure:: https://raw.githubusercontent.com/stackhpc/slurm-visualisation-app/master/images/slurm-job-metrics.png
    :alt: Job metrics

.. figure:: https://raw.githubusercontent.com/stackhpc/slurm-visualisation-app/master/images/darwin-job-visualisation.png
    :alt: Jobs panel

------------
Requirements
------------
Requires the
`monasca-grafana-datasoure Plugin
<https://github.com/openstack/monasca-grafana-datasource>`__
to be installed and configured in your grafana instance to make requests
to a running monasca-api instance.

-----------------------
Installation and Build
-----------------------
Install into :code:`plugins` directory of your existing grafana deployment.

.. code::

    sudo git clone https://github.com/stackhpc/slurm-visualisation-app /var/lib/grafana/plugins/slurm-visualisation-app # clone plugin in grafana plugin directory
    cd /var/lib/grafana/plugins/slurm-visualisation-app # cd into grafana plugin directory
    yum install npm # install npm (if not already installed)
    yum install -g grunt # install grunt cli to automate build
    npm install # install plugin requirements
    grunt # build plugin

--------
Usage
--------

Check out the blog on
`StackHPC
<https://www.stackhpc.com/slurm-monitoring-with-monasca.html>`__
