export const DOCUMENT_TEMPLATES = [
  {
    id: "product_claim_refund",
    categoryId: "product_return",
    title: "Претензия продавцу о возврате товара",
    type: "claim",
    isActive: true,
    variables: [
      "full_name",
      "seller_name",
      "product_name",
      "purchase_date",
      "defect",
      "desired_result",
      "case_title",
      "today"
    ],
    body: `Кому: {{seller_name}}
От: {{full_name}}

ПРЕТЕНЗИЯ
о товаре ненадлежащего качества

{{purchase_date}} я приобрел(а) товар: {{product_name}}.

В процессе использования был выявлен недостаток: {{defect}}.

Прошу рассмотреть обращение по делу "{{case_title}}" и выполнить требование: {{desired_result}}.

К претензии могут быть приложены копии подтверждающих материалов: чек, фото товара, переписка с продавцом и иные доказательства.

Дата: {{today}}
Подпись: ____________________`
  },
  {
    id: "housing_management_request",
    categoryId: "housing",
    title: "Заявление в управляющую организацию",
    type: "request",
    isActive: true,
    variables: [
      "full_name",
      "management_company",
      "address",
      "incident_date",
      "problem_description",
      "case_title",
      "today"
    ],
    body: `Кому: {{management_company}}
От: {{full_name}}
Адрес: {{address}}

ЗАЯВЛЕНИЕ
о необходимости устранения проблемы

{{incident_date}} по адресу {{address}} была зафиксирована проблема: {{problem_description}}.

Прошу провести проверку, принять меры по устранению проблемы и предоставить ответ по делу "{{case_title}}".

К заявлению могут быть приложены фото, видео, переписка и другие подтверждающие материалы.

Дата: {{today}}
Подпись: ____________________`
  },
  {
    id: "housing_inspection_complaint",
    categoryId: "housing",
    title: "Жалоба в жилищную инспекцию",
    type: "complaint",
    isActive: true,
    variables: [
      "full_name",
      "management_company",
      "address",
      "problem_description",
      "request_number",
      "today"
    ],
    body: `В жилищную инспекцию
От: {{full_name}}
Адрес: {{address}}

ЖАЛОБА
на бездействие управляющей организации

По адресу {{address}} имеется проблема: {{problem_description}}.

Ранее было направлено обращение в {{management_company}}. Номер или описание обращения: {{request_number}}.

Прошу провести проверку и принять меры реагирования.

Дата: {{today}}
Подпись: ____________________`
  },
  {
    id: "poor_service_claim",
    categoryId: "poor_service",
    title: "Претензия по некачественной услуге",
    type: "claim",
    isActive: true,
    variables: [
      "full_name",
      "contractor_name",
      "service_name",
      "service_date",
      "quality_problem",
      "desired_result",
      "today"
    ],
    body: `Кому: {{contractor_name}}
От: {{full_name}}

ПРЕТЕНЗИЯ
о некачественно оказанной услуге

{{service_date}} была оказана услуга: {{service_name}}.

Недостатки результата: {{quality_problem}}.

Прошу выполнить требование: {{desired_result}}.

К претензии могут быть приложены договор, подтверждение оплаты, фото результата и переписка с исполнителем.

Дата: {{today}}
Подпись: ____________________`
  },
  {
    id: "problem_fixation_act",
    categoryId: "housing",
    title: "Акт фиксации проблемы",
    type: "act",
    isActive: true,
    variables: [
      "full_name",
      "address",
      "incident_date",
      "problem_description",
      "today"
    ],
    body: `АКТ ФИКСАЦИИ ПРОБЛЕМЫ

Дата составления: {{today}}
Адрес: {{address}}

Я, {{full_name}}, зафиксировал(а) следующую проблему: {{problem_description}}.

Дата обнаружения проблемы: {{incident_date}}.

Приложения: фото, видео, свидетельства, переписка и иные материалы.

Подпись: ____________________`
  }
];
