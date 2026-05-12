export const CATEGORIES = [
  {
    id: "product_return",
    name: "Возврат товара",
    shortName: "Товар",
    icon: "bag",
    description: "Сломался товар, отказали в возврате, спор с магазином или сервисным центром.",
    defaultDeadlineDays: 10,
    requiredEvidence: [
      { id: "receipt", label: "Чек или подтверждение оплаты" },
      { id: "product_photo", label: "Фото товара или недостатка" },
      { id: "seller_chat", label: "Переписка или ответ продавца" }
    ],
    questions: [
      { id: "product_name", label: "Какой товар купили?", placeholder: "Например: смартфон Xiaomi 13" },
      { id: "purchase_date", label: "Когда купили товар?", placeholder: "05.05.2026" },
      { id: "seller_name", label: "Где покупали?", placeholder: "Название магазина или маркетплейса" },
      { id: "defect", label: "Что именно не работает?", placeholder: "Не включается, треснул экран, не заряжается" },
      { id: "desired_result", label: "Что хотите получить?", placeholder: "Возврат денег, замена, ремонт" }
    ],
    route: [
      "Собрать факты покупки",
      "Загрузить чек, фото товара и переписку",
      "Подготовить претензию продавцу",
      "Отправить претензию и сохранить подтверждение",
      "Дождаться ответа в срок",
      "Подготовить жалобу или досудебное требование"
    ]
  },
  {
    id: "housing",
    name: "Проблема ЖКХ",
    shortName: "ЖКХ",
    icon: "home",
    description: "Протечка, лифт, отопление, мусор, управляющая компания не реагирует.",
    defaultDeadlineDays: 10,
    requiredEvidence: [
      { id: "problem_photo", label: "Фото или видео проблемы" },
      { id: "address", label: "Адрес и место нарушения" },
      { id: "management_request", label: "Номер обращения или переписка с УК" }
    ],
    questions: [
      { id: "address", label: "Где возникла проблема?", placeholder: "Адрес, подъезд, этаж, квартира" },
      { id: "incident_date", label: "Когда заметили проблему?", placeholder: "12.05.2026" },
      { id: "management_company", label: "Какая управляющая организация?", placeholder: "Название УК/ТСЖ" },
      { id: "problem_description", label: "Что произошло?", placeholder: "Протечка потолка, не работает лифт" },
      { id: "request_number", label: "Есть номер обращения?", placeholder: "Если уже обращались" }
    ],
    route: [
      "Зафиксировать проблему",
      "Загрузить фото, видео и адрес",
      "Подготовить обращение в УК",
      "Отправить обращение и сохранить подтверждение",
      "Дождаться ответа или устранения",
      "Подготовить жалобу в жилищную инспекцию"
    ]
  },
  {
    id: "poor_service",
    name: "Некачественная услуга",
    shortName: "Услуга",
    icon: "tool",
    description: "Ремонт, подрядчик, сервис или исполнитель сделал плохо, затянул сроки или отказался исправлять.",
    defaultDeadlineDays: 10,
    requiredEvidence: [
      { id: "contract", label: "Договор, заказ-наряд или переписка" },
      { id: "payment", label: "Подтверждение оплаты" },
      { id: "result_photo", label: "Фото результата или недостатков" }
    ],
    questions: [
      { id: "service_name", label: "Какая услуга была заказана?", placeholder: "Ремонт ноутбука, ремонт квартиры" },
      { id: "contractor_name", label: "Кто исполнитель?", placeholder: "Компания, мастер, сервисный центр" },
      { id: "service_date", label: "Когда оказали услугу?", placeholder: "10.05.2026" },
      { id: "quality_problem", label: "Что сделано некачественно?", placeholder: "Не устранили неисправность, испортили деталь" },
      { id: "desired_result", label: "Какой результат нужен?", placeholder: "Переделать, вернуть деньги, уменьшить цену" }
    ],
    route: [
      "Собрать условия заказа",
      "Загрузить договор, оплату и фото результата",
      "Подготовить претензию исполнителю",
      "Отправить претензию и сохранить подтверждение",
      "Дождаться ответа в срок",
      "Подготовить досудебное требование"
    ]
  }
];

export function getCategory(categoryId) {
  return CATEGORIES.find((category) => category.id === categoryId) ?? CATEGORIES[0];
}
